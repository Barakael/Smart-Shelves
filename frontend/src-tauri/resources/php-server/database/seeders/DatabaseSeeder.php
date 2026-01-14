<?php

namespace Database\Seeders;

use App\Models\Room;
use App\Models\Panel;
use App\Models\Shelf;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Create admin user
        $admin = User::firstOrCreate(
            ['email' => 'admin@smartshelves.com'],
            [
                'name' => 'Admin User',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ]
        );

        // Create operator user
        $operator = User::firstOrCreate(
            ['email' => 'operator@smartshelves.com'],
            [
                'name' => 'Operator User',
                'password' => Hash::make('password'),
                'role' => 'operator',
            ]
        );

        // Create rooms
        $room1 = Room::firstOrCreate(
            ['name' => 'Room A'],
            ['description' => 'Main storage room']
        );

        $room2 = Room::firstOrCreate(
            ['name' => 'Room B'],
            ['description' => 'Secondary storage room']
        );

        // Assign rooms to operator (sync to avoid duplicates)
        $operator->rooms()->syncWithoutDetaching([$room1->id, $room2->id]);

        // Create panels for Room A
        $panel1 = Panel::firstOrCreate(
            ['name' => 'Panel 1', 'room_id' => $room1->id],
            [
                'ip_address' => '192.168.1.100',
                'rows' => 3,
                'columns' => 4,
            ]
        );

        $panel2 = Panel::firstOrCreate(
            ['name' => 'Panel 2', 'room_id' => $room1->id],
            [
                'ip_address' => '192.168.1.101',
                'rows' => 2,
                'columns' => 5,
            ]
        );

        // Create panels for Room B
        $panel3 = Panel::firstOrCreate(
            ['name' => 'Panel 1', 'room_id' => $room2->id],
            [
                'ip_address' => '192.168.1.200',
                'rows' => 4,
                'columns' => 3,
            ]
        );

        // Create sample shelves in panels (only if they don't exist)
        // Panel 1 - Row 0 (first row)
        Shelf::firstOrCreate(
            ['panel_id' => $panel1->id, 'row_index' => 0, 'column_index' => 0],
            [
                'name' => 'Shelf R0C0',
                'ip_address' => '192.168.1.10',
                'room_id' => $room1->id,
                'is_controller' => true,
            ]
        );

        Shelf::firstOrCreate(
            ['panel_id' => $panel1->id, 'row_index' => 0, 'column_index' => 1],
            [
                'name' => 'Shelf R0C1',
                'ip_address' => '192.168.1.11',
                'room_id' => $room1->id,
                'is_controller' => false,
            ]
        );

        Shelf::firstOrCreate(
            ['panel_id' => $panel1->id, 'row_index' => 0, 'column_index' => 2],
            [
                'name' => 'Shelf R0C2',
                'ip_address' => '192.168.1.12',
                'room_id' => $room1->id,
                'is_controller' => false,
            ]
        );

        Shelf::firstOrCreate(
            ['panel_id' => $panel1->id, 'row_index' => 0, 'column_index' => 3],
            [
                'name' => 'Shelf R0C3',
                'ip_address' => '192.168.1.13',
                'room_id' => $room1->id,
                'is_controller' => false,
            ]
        );

        // Panel 1 - Row 1
        Shelf::firstOrCreate(
            ['panel_id' => $panel1->id, 'row_index' => 1, 'column_index' => 0],
            [
                'name' => 'Shelf R1C0',
                'ip_address' => '192.168.1.14',
                'room_id' => $room1->id,
                'is_controller' => true,
            ]
        );

        Shelf::firstOrCreate(
            ['panel_id' => $panel1->id, 'row_index' => 1, 'column_index' => 1],
            [
                'name' => 'Shelf R1C1',
                'ip_address' => '192.168.1.15',
                'room_id' => $room1->id,
                'is_controller' => false,
            ]
        );

        // Panel 3 - Row 0
        Shelf::firstOrCreate(
            ['panel_id' => $panel3->id, 'row_index' => 0, 'column_index' => 0],
            [
                'name' => 'Shelf R0C0',
                'ip_address' => '192.168.1.20',
                'room_id' => $room2->id,
                'is_controller' => true,
            ]
        );
    }
}

