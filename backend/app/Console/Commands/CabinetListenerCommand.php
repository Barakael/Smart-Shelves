<?php

namespace App\Console\Commands;

use App\Models\Cabinet;
use App\Models\Shelf;
use App\Services\CabinetSocketService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Exception;

class CabinetListenerCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cabinet:listen {--cabinet-id= : Listen to specific cabinet only}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Listen for incoming notifications from connected cabinets';

    /**
     * Active listener sockets grouped by cabinet ID.
     *
     * @var array
     */
    private array $listeners = [];

    /**
     * Buffer for incomplete packets per cabinet.
     *
     * @var array
     */
    private array $buffers = [];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Cabinet Listener started...');
        Log::info('Cabinet listener command started');

        // Handle signals for graceful shutdown
        pcntl_signal(SIGINT, function () {
            $this->info("\nShutting down gracefully...");
            $this->cleanup();
            exit(0);
        });

        // Get cabinets to listen to
        if ($cabinetId = $this->option('cabinet-id')) {
            $cabinets = Cabinet::where('id', $cabinetId)->where('is_active', true)->get();
        } else {
            $cabinets = Cabinet::where('is_active', true)->get();
        }

        if ($cabinets->isEmpty()) {
            $this->warn('No active cabinets found.');
            return 0;
        }

        $this->info("Listening to " . $cabinets->count() . " cabinet(s)...");

        // Initialize listener sockets
        foreach ($cabinets as $cabinet) {
            $this->initializeListener($cabinet);
        }

        // Main loop: listen for incoming data
        while (true) {
            // Allow signal handling
            pcntl_signal_dispatch();

            $readableSockets = [];

            // Build list of readable sockets
            foreach ($this->listeners as $cabinetId => $socket) {
                if (is_resource($socket)) {
                    $readableSockets[$cabinetId] = $socket;
                }
            }

            if (empty($readableSockets)) {
                sleep(1);
                continue;
            }

            // Use stream_select to wait for incoming data (non-blocking)
            $read = array_values($readableSockets);
            $write = null;
            $except = null;

            $socketCount = stream_select($read, $write, $except, 1); // 1 second timeout

            if ($socketCount === false) {
                Log::error('stream_select error');
                sleep(1);
                continue;
            }

            if ($socketCount === 0) {
                // Timeout, no data available
                continue;
            }

            // Process readable sockets
            foreach ($read as $socket) {
                $cabinetId = array_search($socket, $readableSockets, true);

                if ($cabinetId === false) {
                    continue;
                }

                $this->handleIncomingData($cabinetId);
            }

            // Check for stale listeners and try to reconnect
            if (rand(1, 100) > 90) { // Check every ~10 iterations
                $this->checkAndReconnect($cabinets);
            }
        }

        return 0;
    }

    /**
     * Initialize a listener socket for a cabinet.
     *
     * @param Cabinet $cabinet
     * @return void
     */
    private function initializeListener(Cabinet $cabinet): void
    {
        try {
            $socket = fsockopen(
                $cabinet->ip_address,
                $cabinet->port,
                $errno,
                $errstr,
                10
            );

            if (!$socket) {
                Log::error('Failed to initialize listener for cabinet', [
                    'cabinet_id' => $cabinet->id,
                    'ip' => $cabinet->ip_address,
                    'error' => $errstr,
                ]);
                return;
            }

            stream_set_blocking($socket, false);
            stream_set_timeout($socket, 30);

            $this->listeners[$cabinet->id] = $socket;
            $this->buffers[$cabinet->id] = '';

            $this->line("✓ Listener initialized for cabinet {$cabinet->name} ({$cabinet->ip_address})");
            Log::info('Cabinet listener initialized', [
                'cabinet_id' => $cabinet->id,
                'ip' => $cabinet->ip_address,
            ]);
        } catch (Exception $e) {
            Log::error('Exception initializing listener', [
                'cabinet_id' => $cabinet->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Handle incoming data from a cabinet.
     *
     * @param int $cabinetId
     * @return void
     */
    private function handleIncomingData(int $cabinetId): void
    {
        if (!isset($this->listeners[$cabinetId])) {
            return;
        }

        $socket = $this->listeners[$cabinetId];

        try {
            $data = fread($socket, 1024);

            if ($data === false) {
                Log::warning('Error reading from cabinet socket', [
                    'cabinet_id' => $cabinetId,
                ]);
                unset($this->listeners[$cabinetId]);
                return;
            }

            if (strlen($data) === 0) {
                // Connection closed
                return;
            }

            // Append to buffer
            $this->buffers[$cabinetId] .= $data;

            // Process complete packets
            $this->processPackets($cabinetId);

            Log::debug('Data received from cabinet', [
                'cabinet_id' => $cabinetId,
                'bytes' => strlen($data),
                'hex' => bin2hex($data),
            ]);
        } catch (Exception $e) {
            Log::error('Exception handling incoming data', [
                'cabinet_id' => $cabinetId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Process packets from the buffer.
     *
     * @param int $cabinetId
     * @return void
     */
    private function processPackets(int $cabinetId): void
    {
        $buffer = &$this->buffers[$cabinetId];

        while (strlen($buffer) >= 5) {
            // Look for packet header
            $headerPos = strpos($buffer, chr(0x68));

            if ($headerPos === false) {
                $buffer = '';
                break;
            }

            if ($headerPos > 0) {
                $buffer = substr($buffer, $headerPos);
            }

            // Check if we have a complete packet (68 03 08 [func] [panel_id])
            if (strlen($buffer) >= 5) {
                $packet = substr($buffer, 0, 5);

                // Validate packet structure (68 03 08)
                if (ord($packet[0]) === 0x68 && ord($packet[1]) === 0x03 && ord($packet[2]) === 0x08) {
                    $this->handleNotificationPacket($cabinetId, $packet);
                    $buffer = substr($buffer, 5);
                } else {
                    // Invalid packet, skip this byte
                    $buffer = substr($buffer, 1);
                }
            } else {
                // Incomplete packet
                break;
            }
        }
    }

    /**
     * Handle a panel closure notification packet.
     *
     * @param int $cabinetId
     * @param string $packet
     * @return void
     */
    private function handleNotificationPacket(int $cabinetId, string $packet): void
    {
        $panelId = CabinetSocketService::parseNotificationPacket($packet);

        if ($panelId === null) {
            Log::warning('Failed to parse notification packet', [
                'cabinet_id' => $cabinetId,
                'hex' => bin2hex($packet),
            ]);
            return;
        }

        Log::info('Panel closure notification received', [
            'cabinet_id' => $cabinetId,
            'panel_id' => $panelId,
            'hex' => bin2hex($packet),
        ]);

        try {
            // Find shelves with this cabinet and panel ID
            $shelves = Shelf::where('cabinet_id', $cabinetId)
                ->where('column_index', $panelId)
                ->get();

            if ($shelves->isEmpty()) {
                Log::warning('No shelves found for panel closure notification', [
                    'cabinet_id' => $cabinetId,
                    'panel_id' => $panelId,
                ]);
                return;
            }

            // Update shelf state
            foreach ($shelves as $shelf) {
                $shelf->update(['is_open' => false]);

                Log::info('Shelf state updated', [
                    'shelf_id' => $shelf->id,
                    'is_open' => false,
                ]);

                // TODO: Broadcast event via Laravel Broadcasting for real-time frontend updates
                // Example: broadcast(new ShelfClosed($shelf));
            }

            // Update cabinet last_seen
            Cabinet::find($cabinetId)->update(['last_seen' => now()]);
        } catch (Exception $e) {
            Log::error('Exception handling notification packet', [
                'cabinet_id' => $cabinetId,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Check and reconnect to dead listeners.
     *
     * @param \Illuminate\Database\Eloquent\Collection $cabinets
     * @return void
     */
    private function checkAndReconnect(\Illuminate\Database\Eloquent\Collection $cabinets): void
    {
        foreach ($cabinets as $cabinet) {
            if (!isset($this->listeners[$cabinet->id]) || !is_resource($this->listeners[$cabinet->id])) {
                Log::warning('Reconnecting to cabinet', [
                    'cabinet_id' => $cabinet->id,
                    'ip' => $cabinet->ip_address,
                ]);
                $this->initializeListener($cabinet);
            }
        }
    }

    /**
     * Clean up resources on shutdown.
     *
     * @return void
     */
    private function cleanup(): void
    {
        foreach ($this->listeners as $socket) {
            if (is_resource($socket)) {
                @fclose($socket);
            }
        }
        Log::info('Cabinet listener shutdown');
    }
}
