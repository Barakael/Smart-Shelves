<?php

namespace Database\Seeders;

use App\Models\Cabinet;
use App\Models\Panel;
use App\Models\Plan;
use App\Models\Room;
use App\Models\Shelf;
use App\Models\Subscription;
use App\Models\User;
use App\Support\HexCommandFormatter;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $rooms = $this->seedInfrastructure();

            [$admin, $operator] = $this->seedUsers($rooms);

            $this->assignOperatorRooms($operator, $rooms);

            $this->seedSubscriptions($rooms);
        });
    }

    /**
     * Create the physical layout (rooms, panels, cabinets, shelves).
     *
     * @return array<string, Room>
     */
    private function seedInfrastructure(): array
    {
        $rooms = [];

        foreach ($this->infrastructure() as $roomConfig) {
            $room = Room::updateOrCreate(
                ['name' => $roomConfig['name']],
                ['description' => $roomConfig['description']]
            );

            $rooms[$roomConfig['slug']] = $room;

            $this->seedPanelsAndCabinets($room, $roomConfig['panels'] ?? []);
        }

        return $rooms;
    }

    /**
     * Ensure the default admin/operator accounts exist with known passwords.
     */
    private function seedUsers(array $rooms): array
    {
        $primaryRoomId = $rooms['vault-alpha']->id ?? null;

        $admin = User::updateOrCreate(
            ['email' => 'admin@smartshelves.com'],
            [
                'name' => 'System Administrator',
                'password' => Hash::make('12341234Q'),
                'phone' => '+1 (555) 010-0001',
                'role' => 'admin',
                'room_id' => $primaryRoomId,
            ]
        );

        $operator = User::updateOrCreate(
            ['email' => 'operator@smartshelves.com'],
            [
                'name' => 'Vault Operator',
                'password' => Hash::make('12341234Q'),
                'phone' => '+1 (555) 010-0002',
                'role' => 'operator',
                'room_id' => $primaryRoomId,
            ]
        );

        return [$admin, $operator];
    }

    private function assignOperatorRooms(User $operator, array $rooms): void
    {
        if (!$operator->exists) {
            return;
        }

        $operatorRoomIds = collect($rooms)
            ->take(2)
            ->pluck('id')
            ->all();

        if (empty($operatorRoomIds)) {
            return;
        }

        $operator->rooms()->syncWithoutDetaching($operatorRoomIds);
        $operator->update(['room_id' => $operatorRoomIds[0]]);
    }

    /**
     * Seed subscription plans and create active subscriptions for all rooms.
     */
    private function seedSubscriptions(array $rooms): void
    {
        // Create the default plan
        $plan = Plan::updateOrCreate(
            ['name' => 'Annual License'],
            [
                'description' => 'Standard annual subscription plan for Smart Shelves system',
                'price' => 99.00,
                'period_days' => 365,
                'is_active' => true,
            ]
        );

        // Create active subscriptions for all rooms (1 year from now)
        $startDate = Carbon::now();
        $endDate = $startDate->copy()->addDays(365);
        $graceEndDate = $endDate->copy()->addDays(7);

        foreach ($rooms as $room) {
            // Check if subscription already exists
            $existingSubscription = Subscription::where('room_id', $room->id)->first();
            
            if (!$existingSubscription) {
                Subscription::create([
                    'room_id' => $room->id,
                    'plan_id' => $plan->id,
                    'status' => 'active',
                    'starts_at' => $startDate,
                    'ends_at' => $endDate,
                    'grace_ends_at' => $graceEndDate,
                    'auto_renew' => false,
                ]);
            }

            // Update room subscription status
            $room->update([
                'subscription_status' => 'active',
                'subscription_expires_at' => $endDate,
            ]);
        }
    }

    private function seedPanelsAndCabinets(Room $room, array $panelDefinitions): void
    {
        foreach ($panelDefinitions as $panelConfig) {
            $panel = Panel::updateOrCreate(
                ['name' => $panelConfig['name'], 'room_id' => $room->id],
                [
                    'ip_address' => $panelConfig['ip_address'] ?? null,
                    'rows' => max(1, (int) ($panelConfig['rows'] ?? 1)),
                    'columns' => max(1, (int) ($panelConfig['columns'] ?? 1)),
                ]
            );

            if (empty($panelConfig['cabinet'])) {
                continue;
            }

            $cabinetConfig = $panelConfig['cabinet'];

            $cabinet = Cabinet::updateOrCreate(
                ['name' => $cabinetConfig['name'], 'room_id' => $room->id],
                [
                    'ip_address' => $cabinetConfig['ip_address'],
                    'port' => $cabinetConfig['port'] ?? 8080,
                    'function_byte' => strtoupper($cabinetConfig['function_byte']),
                    'checksum_offset' => (int) $cabinetConfig['checksum_offset'],
                    'shelf_count' => (int) $cabinetConfig['shelf_count'],
                    'total_rows' => max(1, (int) ($cabinetConfig['total_rows'] ?? $panel->rows ?? 1)),
                    'total_columns' => max(1, (int) ($cabinetConfig['total_columns'] ?? $panel->columns ?? 1)),
                    'controller_row' => $cabinetConfig['controller_row'] ?? null,
                    'controller_column' => $cabinetConfig['controller_column'] ?? null,
                    'macro_close_command' => $this->normalizeHex($cabinetConfig['macro_close_command'] ?? null),
                    'macro_lock_command' => $this->normalizeHex($cabinetConfig['macro_lock_command'] ?? null),
                    'macro_vent_command' => $this->normalizeHex($cabinetConfig['macro_vent_command'] ?? null),
                    'is_active' => $cabinetConfig['is_active'] ?? true,
                ]
            );

            $this->syncCabinetShelves($cabinet, $panel, $cabinetConfig);
        }
    }

    private function syncCabinetShelves(Cabinet $cabinet, Panel $panel, array $cabinetConfig): void
    {
        $shelfTemplates = $cabinetConfig['shelves'] ?? [];
        $desiredCount = count($shelfTemplates) ?: (int) ($cabinetConfig['shelf_count'] ?? max(1, $panel->columns));
        $rows = max(1, (int) ($panel->rows ?? $cabinet->total_rows ?? 1));
        $columns = max(1, (int) ($panel->columns ?? $cabinet->total_columns ?? 1));
        $timestamp = now();

        $cabinet->shelves()->delete();

        $payload = [];
        $groupSize = max(1, intdiv($desiredCount, max(1, $rows)));

        for ($index = 0; $index < $desiredCount; $index++) {
            $template = $shelfTemplates[$index] ?? [];
            $columnIndex = $template['column_index'] ?? ($index % $columns);
            $rowIndex = $template['row_index'] ?? intdiv($index, $groupSize);
            $shelfNumber = $template['shelf_number'] ?? ($index + 1);

            $payload[] = [
                'name' => $template['name'] ?? sprintf('%s Shelf %02d', $panel->name, $shelfNumber),
                'ip_address' => $template['ip_address'] ?? $cabinet->ip_address,
                'rows' => $template['rows'] ?? $rows,
                'columns' => $template['columns'] ?? $columns,
                'controller' => $template['controller'] ?? sprintf('CTRL-%02d', $shelfNumber),
                'room_id' => $panel->room_id,
                'panel_id' => $panel->id,
                'cabinet_id' => $cabinet->id,
                'row_index' => $rowIndex,
                'column_index' => $columnIndex,
                'is_controller' => $template['is_controller'] ?? (
                    $columnIndex === ($cabinet->controller_column ?? 0)
                    && $rowIndex === ($cabinet->controller_row ?? 0)
                ),
                'shelf_number' => $shelfNumber,
                'is_first' => $template['is_first'] ?? ($index === 0),
                'open_direction' => $template['open_direction'] ?? ($index % 2 === 0 ? 'right' : 'left'),
                'is_open' => $template['is_open'] ?? false,
                'open_command' => $template['open_command'] ?? $this->buildOpenCommand($cabinet, $shelfNumber),
                'close_command' => $template['close_command'] ?? $this->buildCloseCommand($cabinet, $shelfNumber),
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ];
        }

        if (!empty($payload)) {
            Shelf::insert($payload);
            $cabinet->update([
                'shelf_count' => $desiredCount,
                'total_rows' => $rows,
                'total_columns' => $columns,
            ]);
        }
    }

    private function buildOpenCommand(Cabinet $cabinet, int $panelId): string
    {
        $functionByte = strtoupper(str_pad($cabinet->function_byte, 2, '0', STR_PAD_LEFT));
        $panelByte = $this->formatHexByte($panelId);
        $checksum = $this->formatHexByte($panelId + (int) $cabinet->checksum_offset);

        return "68 04 09 {$functionByte} {$panelByte} {$checksum}";
    }

    private function buildCloseCommand(Cabinet $cabinet, int $panelId): string
    {
        $functionByte = strtoupper(str_pad($cabinet->function_byte, 2, '0', STR_PAD_LEFT));
        $panelByte = $this->formatHexByte($panelId);

        return "68 03 08 {$functionByte} {$panelByte}";
    }

    private function formatHexByte(int $value): string
    {
        return strtoupper(str_pad(dechex($value & 0xFF), 2, '0', STR_PAD_LEFT));
    }

    private function normalizeHex(?string $value): ?string
    {
        return $value ? HexCommandFormatter::normalize($value) : null;
    }

    /**
     * Blueprint describing the default installation.
     */
    private function infrastructure(): array
    {
        return [
            [
                'slug' => 'vault-alpha',
                'name' => 'Vault Alpha',
                'description' => 'High-density active storage floor for urgent case files.',
                'panels' => [
                    [
                        'name' => 'Alpha North Rail',
                        'ip_address' => '192.168.10.21',
                        'rows' => 3,
                        'columns' => 6,
                        'cabinet' => [
                            'name' => 'Cabinet AL-01',
                            'ip_address' => '10.0.10.11',
                            'port' => 8080,
                            'function_byte' => '01',
                            'checksum_offset' => 0x0A,
                            'total_rows' => 3,
                            'total_columns' => 6,
                            'controller_row' => 0,
                            'controller_column' => 0,
                            'shelf_count' => 6,
                            'macro_close_command' => '68 04 09 01 00 0B',
                            'macro_lock_command' => '68 04 10 01 00 0C',
                            'macro_vent_command' => '68 04 11 01 00 0D',
                            'shelves' => [
                                [
                                    'name' => 'Alpha North 01',
                                    'column_index' => 0,
                                    'row_index' => 0,
                                    'controller' => 'PLC-AN-01',
                                    'open_direction' => 'right',
                                    'ip_address' => '10.0.10.111',
                                    'is_controller' => true,
                                ],
                                [
                                    'name' => 'Alpha North 02',
                                    'column_index' => 1,
                                    'row_index' => 0,
                                    'controller' => 'PLC-AN-02',
                                    'open_direction' => 'left',
                                    'ip_address' => '10.0.10.112',
                                ],
                                [
                                    'name' => 'Alpha North 03',
                                    'column_index' => 2,
                                    'row_index' => 0,
                                    'controller' => 'PLC-AN-03',
                                    'ip_address' => '10.0.10.113',
                                ],
                                [
                                    'name' => 'Alpha North 04',
                                    'column_index' => 3,
                                    'row_index' => 1,
                                    'controller' => 'PLC-AN-04',
                                    'is_controller' => true,
                                    'ip_address' => '10.0.10.114',
                                ],
                                [
                                    'name' => 'Alpha North 05',
                                    'column_index' => 4,
                                    'row_index' => 1,
                                    'controller' => 'PLC-AN-05',
                                    'ip_address' => '10.0.10.115',
                                ],
                                [
                                    'name' => 'Alpha North 06',
                                    'column_index' => 5,
                                    'row_index' => 1,
                                    'controller' => 'PLC-AN-06',
                                    'ip_address' => '10.0.10.116',
                                ],
                            ],
                        ],
                    ],
                    [
                        'name' => 'Alpha South Rail',
                        'ip_address' => '192.168.10.22',
                        'rows' => 2,
                        'columns' => 5,
                        'cabinet' => [
                            'name' => 'Cabinet AL-02',
                            'ip_address' => '10.0.10.12',
                            'port' => 8081,
                            'function_byte' => '03',
                            'checksum_offset' => 0x0C,
                            'total_rows' => 2,
                            'total_columns' => 5,
                            'controller_row' => 0,
                            'controller_column' => 0,
                            'shelf_count' => 5,
                            'macro_close_command' => '68 04 09 03 00 12',
                            'macro_lock_command' => '68 04 10 03 00 13',
                            'macro_vent_command' => '68 04 11 03 00 14',
                            'shelves' => [
                                [
                                    'name' => 'Alpha South 01',
                                    'column_index' => 0,
                                    'row_index' => 0,
                                    'controller' => 'PLC-AS-01',
                                    'ip_address' => '10.0.10.121',
                                    'is_controller' => true,
                                ],
                                [
                                    'name' => 'Alpha South 02',
                                    'column_index' => 1,
                                    'row_index' => 0,
                                    'controller' => 'PLC-AS-02',
                                    'ip_address' => '10.0.10.122',
                                ],
                                [
                                    'name' => 'Alpha South 03',
                                    'column_index' => 2,
                                    'row_index' => 0,
                                    'controller' => 'PLC-AS-03',
                                    'ip_address' => '10.0.10.123',
                                ],
                                [
                                    'name' => 'Alpha South 04',
                                    'column_index' => 3,
                                    'row_index' => 1,
                                    'controller' => 'PLC-AS-04',
                                    'ip_address' => '10.0.10.124',
                                ],
                                [
                                    'name' => 'Alpha South 05',
                                    'column_index' => 4,
                                    'row_index' => 1,
                                    'controller' => 'PLC-AS-05',
                                    'ip_address' => '10.0.10.125',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            [
                'slug' => 'vault-beta',
                'name' => 'Vault Beta',
                'description' => 'Secondary picking area with mixed density cabinets.',
                'panels' => [
                    [
                        'name' => 'Beta Compact Row',
                        'ip_address' => '192.168.20.31',
                        'rows' => 2,
                        'columns' => 4,
                        'cabinet' => [
                            'name' => 'Cabinet BT-01',
                            'ip_address' => '10.0.20.21',
                            'port' => 8090,
                            'function_byte' => '05',
                            'checksum_offset' => 0x10,
                            'total_rows' => 2,
                            'total_columns' => 4,
                            'controller_row' => 0,
                            'controller_column' => 1,
                            'shelf_count' => 4,
                            'macro_close_command' => '68 04 09 05 00 18',
                            'macro_lock_command' => '68 04 10 05 00 19',
                            'macro_vent_command' => '68 04 11 05 00 1A',
                            'shelves' => [
                                [
                                    'name' => 'Beta Compact 01',
                                    'column_index' => 0,
                                    'row_index' => 0,
                                    'controller' => 'PLC-BC-01',
                                    'ip_address' => '10.0.20.221',
                                    'is_controller' => false,
                                ],
                                [
                                    'name' => 'Beta Compact 02',
                                    'column_index' => 1,
                                    'row_index' => 0,
                                    'controller' => 'PLC-BC-02',
                                    'ip_address' => '10.0.20.222',
                                    'is_controller' => true,
                                ],
                                [
                                    'name' => 'Beta Compact 03',
                                    'column_index' => 2,
                                    'row_index' => 1,
                                    'controller' => 'PLC-BC-03',
                                    'ip_address' => '10.0.20.223',
                                ],
                                [
                                    'name' => 'Beta Compact 04',
                                    'column_index' => 3,
                                    'row_index' => 1,
                                    'controller' => 'PLC-BC-04',
                                    'ip_address' => '10.0.20.224',
                                ],
                            ],
                        ],
                    ],
                    [
                        'name' => 'Beta Archive Row',
                        'ip_address' => '192.168.20.32',
                        'rows' => 1,
                        'columns' => 3,
                        'cabinet' => [
                            'name' => 'Cabinet BT-02',
                            'ip_address' => '10.0.20.22',
                            'port' => 8091,
                            'function_byte' => '07',
                            'checksum_offset' => 0x12,
                            'total_rows' => 1,
                            'total_columns' => 3,
                            'controller_row' => 0,
                            'controller_column' => 0,
                            'shelf_count' => 3,
                            'macro_close_command' => '68 04 09 07 00 1C',
                            'macro_lock_command' => '68 04 10 07 00 1D',
                            'macro_vent_command' => '68 04 11 07 00 1E',
                            'shelves' => [
                                [
                                    'name' => 'Beta Archive 01',
                                    'column_index' => 0,
                                    'row_index' => 0,
                                    'controller' => 'PLC-BA-01',
                                    'ip_address' => '10.0.20.231',
                                    'is_controller' => true,
                                ],
                                [
                                    'name' => 'Beta Archive 02',
                                    'column_index' => 1,
                                    'row_index' => 0,
                                    'controller' => 'PLC-BA-02',
                                    'ip_address' => '10.0.20.232',
                                ],
                                [
                                    'name' => 'Beta Archive 03',
                                    'column_index' => 2,
                                    'row_index' => 0,
                                    'controller' => 'PLC-BA-03',
                                    'ip_address' => '10.0.20.233',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
            [
                'slug' => 'cold-archive',
                'name' => 'Cold Archive Gamma',
                'description' => 'Climate-controlled archive used for retention copies.',
                'panels' => [
                    [
                        'name' => 'Gamma Cold Aisle',
                        'ip_address' => '192.168.30.41',
                        'rows' => 1,
                        'columns' => 3,
                        'cabinet' => [
                            'name' => 'Cabinet GM-01',
                            'ip_address' => '10.0.30.31',
                            'port' => 8100,
                            'function_byte' => '09',
                            'checksum_offset' => 0x18,
                            'total_rows' => 1,
                            'total_columns' => 3,
                            'controller_row' => 0,
                            'controller_column' => 1,
                            'shelf_count' => 3,
                            'macro_close_command' => '68 04 09 09 00 20',
                            'macro_lock_command' => '68 04 10 09 00 21',
                            'macro_vent_command' => '68 04 11 09 00 22',
                            'shelves' => [
                                [
                                    'name' => 'Gamma Cold 01',
                                    'column_index' => 0,
                                    'row_index' => 0,
                                    'controller' => 'PLC-GC-01',
                                    'ip_address' => '10.0.30.331',
                                ],
                                [
                                    'name' => 'Gamma Cold 02',
                                    'column_index' => 1,
                                    'row_index' => 0,
                                    'controller' => 'PLC-GC-02',
                                    'ip_address' => '10.0.30.332',
                                    'is_controller' => true,
                                ],
                                [
                                    'name' => 'Gamma Cold 03',
                                    'column_index' => 2,
                                    'row_index' => 0,
                                    'controller' => 'PLC-GC-03',
                                    'ip_address' => '10.0.30.333',
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }
}

