<?php

namespace App\Support;

use InvalidArgumentException;

class HexCommandFormatter
{
    /**
     * Normalize a hex command into spaced uppercase byte pairs (e.g. "68 04 09").
     */
    public static function normalize(?string $hex): ?string
    {
        if ($hex === null) {
            return null;
        }

        $trimmed = trim($hex);
        if ($trimmed === '') {
            return null;
        }

        $clean = self::sanitize($trimmed);

        return implode(' ', str_split($clean, 2));
    }

    /**
     * Convert a hex command string into binary data suitable for socket transmission.
     */
    public static function toBinary(string $hex): string
    {
        $clean = self::sanitize($hex);
        $binary = hex2bin($clean);

        if ($binary === false) {
            throw new InvalidArgumentException('Unable to convert hex command to binary payload.');
        }

        return $binary;
    }

    private static function sanitize(string $hex): string
    {
        $clean = preg_replace('/[^0-9A-Fa-f]/', '', $hex);

        if ($clean === null || $clean === '') {
            throw new InvalidArgumentException('Hex command must contain hexadecimal characters.');
        }

        if (strlen($clean) % 2 !== 0) {
            throw new InvalidArgumentException('Hex command must have an even number of characters.');
        }

        return strtoupper($clean);
    }
}
