<?php

namespace App\Services;

use App\Models\Cabinet;
use App\Models\Shelf;
use App\Support\HexCommandFormatter;
use Illuminate\Support\Facades\Log;
use Exception;

class CabinetSocketService
{
    /**
     * Connection pool for maintaining persistent TCP connections.
     * Format: ['ip:port' => resource]
     */
    private static array $connections = [];

    /**
     * Configuration constants
     */
    private const HEADER = 0x68;
    private const LENGTH_BYTE = 0x04;
    private const GROUP_BYTE = 0x09;
    private const SOCKET_TIMEOUT = 30;
    private const RECONNECT_ATTEMPTS = 3;

    /**
     * Send an "open panel" command to a cabinet.
     * 
     * Structure: [Header] [Len] [Group] [Function] [Panel_ID] [Checksum]
     * Example for Cabinet A opening Panel 11: 68 04 09 01 0B 15
     *
     * @param Cabinet $cabinet
     * @param int $panelId
     * @return bool
     * @throws Exception
     */
    public static function sendOpenCommand(Cabinet $cabinet, int $panelId): bool
    {
        try {
            $packet = self::buildPacket(
                hexdec($cabinet->function_byte),
                $panelId,
                $cabinet->checksum_offset
            );

            return self::sendPacket($cabinet, $packet);
        } catch (Exception $e) {
            Log::error('Failed to send open command', [
                'cabinet_id' => $cabinet->id,
                'ip' => $cabinet->ip_address,
                'panel_id' => $panelId,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    /**
     * Send a shelf-specific command. When a custom hex command is provided on the shelf,
     * it is used directly; otherwise the default open command is generated.
     */
    public static function sendShelfCommand(Shelf $shelf, string $operation = 'open'): bool
    {
        $cabinet = $shelf->cabinet;

        if (!$cabinet) {
            throw new Exception('Shelf is not linked to a cabinet controller.');
        }

        $command = $operation === 'close' ? $shelf->close_command : $shelf->open_command;

        if ($command) {
            return self::sendHexString($cabinet, $command);
        }

        if ($operation === 'close') {
            Log::info('No close command specified for shelf; skipping TCP command', [
                'shelf_id' => $shelf->id,
                'cabinet_id' => $cabinet->id,
            ]);
            return true;
        }

        $panelId = (int) ($shelf->column_index ?? 0);
        $panelId = max(1, $panelId + 1);

        return self::sendOpenCommand($cabinet, $panelId);
    }

    /**
     * Send a manual hex command string to the cabinet.
     */
    public static function sendHexString(Cabinet $cabinet, string $hexCommand): bool
    {
        $packet = HexCommandFormatter::toBinary($hexCommand);

        return self::sendPacket($cabinet, $packet);
    }

    /**
     * Build a hex packet for sending to the cabinet.
     * 
     * @param int $functionByte
     * @param int $panelId
     * @param int $checksumOffset
     * @return string Binary packet data
     */
    private static function buildPacket(int $functionByte, int $panelId, int $checksumOffset): string
    {
        if ($panelId < 0 || $panelId > 255) {
            throw new Exception('Panel ID must be between 0 and 255.');
        }

        $checksum = $panelId + $checksumOffset;

        return chr(self::HEADER) .
               chr(self::LENGTH_BYTE) .
               chr(self::GROUP_BYTE) .
               chr($functionByte) .
               chr($panelId) .
               chr($checksum);
    }

    /**
     * Send a raw packet to the cabinet via TCP socket.
     *
     * @param Cabinet $cabinet
     * @param string $packet Binary packet data
     * @return bool
     * @throws Exception
     */
    private static function sendPacket(Cabinet $cabinet, string $packet): bool
    {
        $connection = self::getConnection($cabinet);

        if (!$connection) {
            throw new Exception("Cannot establish connection to cabinet {$cabinet->ip_address}");
        }

        $bytesWritten = fwrite($connection, $packet);
        if ($bytesWritten === false || $bytesWritten === 0) {
            // Connection failed, remove from pool and retry
            self::closeConnection($cabinet);
            $connection = self::getConnection($cabinet, forceNew: true);
            $bytesWritten = fwrite($connection, $packet);

            if ($bytesWritten === false || $bytesWritten === 0) {
                throw new Exception("Failed to write packet to {$cabinet->ip_address}");
            }
        }

        Log::info('Cabinet command sent', [
            'cabinet_id' => $cabinet->id,
            'ip' => $cabinet->ip_address,
            'hex' => bin2hex($packet),
            'bytes_written' => $bytesWritten,
        ]);

        // Update last seen timestamp
        $cabinet->update(['last_seen' => now()]);

        return true;
    }

    /**
     * Get or establish a connection to a cabinet.
     *
     * @param Cabinet $cabinet
     * @param bool $forceNew
     * @return resource|false
     */
    private static function getConnection(Cabinet $cabinet, bool $forceNew = false)
    {
        $key = "{$cabinet->ip_address}:{$cabinet->port}";

        if (!$forceNew && isset(self::$connections[$key]) && is_resource(self::$connections[$key])) {
            return self::$connections[$key];
        }

        // Close old connection if exists
        if (isset(self::$connections[$key])) {
            @fclose(self::$connections[$key]);
        }

        // Attempt to create new connection
        for ($attempt = 1; $attempt <= self::RECONNECT_ATTEMPTS; $attempt++) {
            $socket = @fsockopen(
                $cabinet->ip_address,
                $cabinet->port,
                $errno,
                $errstr,
                self::SOCKET_TIMEOUT
            );

            if ($socket !== false) {
                stream_set_blocking($socket, false);
                stream_set_timeout($socket, self::SOCKET_TIMEOUT);

                self::$connections[$key] = $socket;
                Log::info('Cabinet connection established', [
                    'cabinet_id' => $cabinet->id,
                    'ip' => $cabinet->ip_address,
                    'port' => $cabinet->port,
                    'attempt' => $attempt,
                ]);

                return $socket;
            }

            Log::warning('Cabinet connection attempt failed', [
                'cabinet_id' => $cabinet->id,
                'ip' => $cabinet->ip_address,
                'port' => $cabinet->port,
                'attempt' => $attempt,
                'errno' => $errno,
                'errstr' => $errstr,
            ]);

            if ($attempt < self::RECONNECT_ATTEMPTS) {
                usleep(500000 * $attempt); // Exponential backoff
            }
        }

        return false;
    }

    /**
     * Close a connection to a cabinet.
     *
     * @param Cabinet $cabinet
     * @return void
     */
    public static function closeConnection(Cabinet $cabinet): void
    {
        $key = "{$cabinet->ip_address}:{$cabinet->port}";

        if (isset(self::$connections[$key]) && is_resource(self::$connections[$key])) {
            @fclose(self::$connections[$key]);
            unset(self::$connections[$key]);
            Log::info('Cabinet connection closed', [
                'cabinet_id' => $cabinet->id,
                'ip' => $cabinet->ip_address,
            ]);
        }
    }

    /**
     * Close all connections in the pool.
     *
     * @return void
     */
    public static function closeAllConnections(): void
    {
        foreach (self::$connections as $connection) {
            if (is_resource($connection)) {
                @fclose($connection);
            }
        }
        self::$connections = [];
        Log::info('All cabinet connections closed');
    }

    /**
     * Parse an incoming notification packet and extract panel ID.
     * Format: 68 03 08 [Function] [Panel_ID]
     * 
     * @param string $packet Binary packet data
     * @return int|null Panel ID or null if invalid
     */
    public static function parseNotificationPacket(string $packet): ?int
    {
        if (strlen($packet) < 5) {
            return null;
        }

        $header = ord($packet[0]);
        $len = ord($packet[1]);
        $group = ord($packet[2]);

        // Validate packet structure
        if ($header !== self::HEADER || $len !== 0x03 || $group !== 0x08) {
            return null;
        }

        // Extract panel ID (last byte)
        $panelId = ord($packet[4]);

        return $panelId;
    }

    /**
     * Test connection to a cabinet (used for config validation).
     *
     * @param string $ipAddress
     * @param int $port
     * @return bool
     */
    public static function testConnection(string $ipAddress, int $port = 8080): bool
    {
        $socket = @fsockopen($ipAddress, $port, $errno, $errstr, 5);

        if ($socket !== false) {
            @fclose($socket);
            return true;
        }

        Log::warning('Cabinet test connection failed', [
            'ip' => $ipAddress,
            'port' => $port,
            'errno' => $errno,
            'errstr' => $errstr,
        ]);

        return false;
    }
}
