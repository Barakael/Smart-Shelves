<?php

namespace App\Services;

use App\Models\Cabinet;
use App\Models\NotificationItem;
use App\Models\Shelf;
use App\Models\User;
use Illuminate\Support\Collection;

class SensitiveCabinetNotificationService
{
    public function notifyShelfOpened(Cabinet $cabinet, Shelf $shelf, ?User $actor = null): void
    {
        if (!$cabinet->is_sensitive) {
            return;
        }

        $shelfLabel = $shelf->shelf_number ?? (($shelf->column_index ?? 0) + 1);
        $title = 'Sensitive cabinet opened';
        $message = sprintf(
            'Shelf %s (%s) in %s was opened%s.',
            $shelfLabel,
            $shelf->name,
            $cabinet->name,
            $actor ? " by {$actor->name}" : ''
        );

        $payload = [
            'cabinet_id' => $cabinet->id,
            'cabinet_name' => $cabinet->name,
            'room_id' => $cabinet->room_id,
            'shelf_id' => $shelf->id,
            'shelf_name' => $shelf->name,
            'action' => 'open_shelf',
            'actor_user_id' => $actor?->id,
            'actor_name' => $actor?->name,
        ];

        $this->createForRecipients(
            $this->resolveRecipients($cabinet->room_id),
            'sensitive_cabinet_opened',
            $title,
            $message,
            $payload
        );
    }

    private function resolveRecipients(?int $roomId): Collection
    {
        return User::query()
            ->where(function ($query) use ($roomId) {
                $query->whereIn('role', ['admin', 'manager']);

                if ($roomId) {
                    $query->orWhere(function ($subQuery) use ($roomId) {
                        $subQuery->where('role', 'operator')
                            ->where('room_id', $roomId);
                    });
                }
            })
            ->select('id')
            ->get();
    }

    private function createForRecipients(
        Collection $recipients,
        string $type,
        string $title,
        string $message,
        array $data
    ): void {
        if ($recipients->isEmpty()) {
            return;
        }

        $now = now();
        $rows = $recipients->map(function ($user) use ($type, $title, $message, $data, $now) {
            return [
                'user_id' => $user->id,
                'type' => $type,
                'title' => $title,
                'message' => $message,
                'data' => json_encode($data),
                'is_read' => false,
                'read_at' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        })->all();

        NotificationItem::insert($rows);
    }
}

