# Hex Command Reference & Testing

## Packet Structure

All commands follow this exact structure:

```
Byte Position:  0     1     2     3        4         5
Data:        [0x68][0x04][0x09][Func] [Panel_ID] [Checksum]
Name:        Header Length Group  Function Panel     Checksum
```

### Field Definitions

| Field | Value | Description |
|-------|-------|-------------|
| Header | 0x68 | Message start marker (fixed) |
| Length | 0x04 | Payload length (fixed) |
| Group | 0x09 | Message group (fixed) |
| Function | Variable | Cabinet-specific function byte |
| Panel_ID | Variable | Panel/shelf column index (0-14) |
| Checksum | Calculated | Panel_ID + Cabinet's checksum_offset |

## Cabinet Configurations

### Cabinet A (192.168.10.11)
- **Function Byte**: 0x01 (hex) = 1 (decimal)
- **Checksum Offset**: 0x0A (hex) = 10 (decimal)
- **Purpose**: Storage/Display cabinets

### Cabinet B (192.168.10.12)
- **Function Byte**: 0x03 (hex) = 3 (decimal)
- **Checksum Offset**: 0x0C (hex) = 12 (decimal)
- **Purpose**: Cold storage/Premium items

### Scaling (Cabinet C, D, E...)

When adding more cabinets, use:
- **Cabinet C**: Function=0x05, Offset=0x0E (14)
- **Cabinet D**: Function=0x07, Offset=0x10 (16)
- **Cabinet E**: Function=0x09, Offset=0x12 (18)
- **Cabinet F**: Function=0x0B, Offset=0x14 (20)
- **Cabinet G**: Function=0x0D, Offset=0x16 (22)
- **Cabinet H**: Function=0x0F, Offset=0x18 (24)
- **Cabinet I**: Function=0x11, Offset=0x1A (26)
- **Cabinet J**: Function=0x13, Offset=0x1C (28)

Pattern: Each new cabinet increments function byte by 2 and offset by 2.

## Command Examples

### Cabinet A - Opening Panels

#### Panel 0 (Column 0)
```
Request:  68 04 09 01 00 0A
Hex Bytes: [0x68][0x04][0x09][0x01][0x00][0x0A]
Checksum: 0x00 + 0x0A = 0x0A
```

#### Panel 1 (Column 1)
```
Request:  68 04 09 01 01 0B
Hex Bytes: [0x68][0x04][0x09][0x01][0x01][0x0B]
Checksum: 0x01 + 0x0A = 0x0B
```

#### Panel 5 (Column 5)
```
Request:  68 04 09 01 05 0F
Hex Bytes: [0x68][0x04][0x09][0x01][0x05][0x0F]
Checksum: 0x05 + 0x0A = 0x0F
```

#### Panel 10 (Column 10)
```
Request:  68 04 09 01 0A 14
Hex Bytes: [0x68][0x04][0x09][0x01][0x0A][0x14]
Checksum: 0x0A + 0x0A = 0x14 (20 decimal)
```

#### Panel 11 (Column 11) - **Primary Example**
```
Request:  68 04 09 01 0B 15
Hex Bytes: [0x68][0x04][0x09][0x01][0x0B][0x15]
Checksum: 0x0B + 0x0A = 0x15 (11 + 10 = 21)
```

#### Panel 14 (Column 14, Maximum)
```
Request:  68 04 09 01 0E 18
Hex Bytes: [0x68][0x04][0x09][0x01][0x0E][0x18]
Checksum: 0x0E + 0x0A = 0x18 (14 + 10 = 24)
```

### Cabinet B - Opening Panels

#### Panel 0
```
Request:  68 04 09 03 00 0C
Checksum: 0x00 + 0x0C = 0x0C
```

#### Panel 1 - **Primary Example**
```
Request:  68 04 09 03 01 0D
Hex Bytes: [0x68][0x04][0x09][0x03][0x01][0x0D]
Checksum: 0x01 + 0x0C = 0x0D (1 + 12 = 13)
```

#### Panel 5
```
Request:  68 04 09 03 05 11
Checksum: 0x05 + 0x0C = 0x11 (5 + 12 = 17)
```

#### Panel 11 - **Primary Example**
```
Request:  68 04 09 03 0B 17
Hex Bytes: [0x68][0x04][0x09][0x03][0x0B][0x17]
Checksum: 0x0B + 0x0C = 0x17 (11 + 12 = 23)
```

#### Panel 14
```
Request:  68 04 09 03 0E 1A
Checksum: 0x0E + 0x0C = 0x1A (14 + 12 = 26)
```

## Notification Packets

When a cabinet door closes, it sends a notification packet:

```
Byte Position:  0     1     2     3        4
Data:        [0x68][0x03][0x08][Func] [Panel_ID]
Name:        Header Length Group  Function Panel
```

### Notification Examples

#### Cabinet A - Panel 11 Closed
```
Received: 68 03 08 01 0B
Meaning: Cabinet A (func 0x01) reported Panel 11 (0x0B) is now closed
Action: Find Shelf with cabinet_id=1, column_index=11 and set is_open=false
```

#### Cabinet B - Panel 1 Closed
```
Received: 68 03 08 03 01
Meaning: Cabinet B (func 0x03) reported Panel 1 (0x01) is now closed
Action: Find Shelf with cabinet_id=2, column_index=1 and set is_open=false
```

#### Cabinet A - Panel 0 Closed
```
Received: 68 03 08 01 00
Meaning: Cabinet A (func 0x01) reported Panel 0 (0x00) is now closed
```

## Checksum Calculation

Checksum is simple addition:
```
Checksum = Panel_ID + Cabinet_Checksum_Offset
```

### Formula in Code
```python
# Python example
panel_id = 0x0B  # 11
cabinet_offset = 0x0A  # 10
checksum = (panel_id + cabinet_offset) & 0xFF  # Mask to 8 bits
# Result: 0x15 (21)
```

```php
// PHP example
$panel_id = 0x0B;
$offset = 0x0A;
$checksum = ($panel_id + $offset) & 0xFF;
// Result: 0x15
```

```javascript
// JavaScript example
const panelId = 0x0B;
const offset = 0x0A;
const checksum = (panelId + offset) & 0xFF;
// Result: 0x15
```

## Hex to Decimal Conversions

Common values:

| Hex | Decimal | Hex | Decimal |
|-----|---------|-----|---------|
| 0x00 | 0 | 0x08 | 8 |
| 0x01 | 1 | 0x09 | 9 |
| 0x02 | 2 | 0x0A | 10 |
| 0x03 | 3 | 0x0B | 11 |
| 0x04 | 4 | 0x0C | 12 |
| 0x05 | 5 | 0x0D | 13 |
| 0x06 | 6 | 0x0E | 14 |
| 0x07 | 7 | 0x0F | 15 |

## Manual Testing

### Using Python

```python
import socket

# Cabinet A example
cabinet_ip = "192.168.10.11"
cabinet_port = 8080

# Build packet for Panel 11
panel_id = 11
checksum = (panel_id + 10) & 0xFF
packet = bytes([0x68, 0x04, 0x09, 0x01, panel_id, checksum])

# Send
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect((cabinet_ip, cabinet_port))
sock.sendall(packet)
print(f"Sent: {packet.hex().upper()}")

# Wait for response (if any)
response = sock.recv(1024)
print(f"Received: {response.hex().upper()}")
sock.close()
```

### Using Netcat

```bash
# Connect to cabinet
nc 192.168.10.11 8080

# Send hex bytes (Cabinet A, Panel 11)
# Type: ^B^C^T^A^K^U (raw bytes)
# Or use echo with hex escape
printf '\x68\x04\x09\x01\x0b\x15' | nc 192.168.10.11 8080
```

### Using Wireshark

Monitor TCP traffic:
```bash
# Monitor port 8080
sudo tcpdump -i eth0 'tcp port 8080' -X -v

# Filter by cabinet IP
sudo tcpdump -i eth0 'host 192.168.10.11 and tcp port 8080' -X
```

## PHP Implementation Reference

```php
// Build packet
function buildPacket($panel_id, $cabinet_offset) {
    $checksum = ($panel_id + $cabinet_offset) & 0xFF;
    return chr(0x68) . chr(0x04) . chr(0x09) . 
           chr($function_byte) . chr($panel_id) . chr($checksum);
}

// Send
$packet = buildPacket(11, 0x0A);
$socket = fsockopen("192.168.10.11", 8080, $errno, $errstr, 30);
fwrite($socket, $packet);
fclose($socket);

// Parse notification
function parseNotification($packet) {
    if (strlen($packet) < 5) return null;
    
    $header = ord($packet[0]);
    $len = ord($packet[1]);
    $group = ord($packet[2]);
    $func = ord($packet[3]);
    $panel_id = ord($packet[4]);
    
    if ($header !== 0x68 || $len !== 0x03 || $group !== 0x08) {
        return null;
    }
    
    return $panel_id;
}
```

## Debugging Checklist

- [ ] Cabinet IP is reachable: `ping 192.168.10.11`
- [ ] Port is open: `nc -zv 192.168.10.11 8080`
- [ ] Checksum calculation is correct: panel_id + offset
- [ ] Packet format matches: [0x68][0x04][0x09][func][panel][checksum]
- [ ] Notification parsing works: [0x68][0x03][0x08][func][panel]
- [ ] Function byte matches cabinet config in database
- [ ] Checksum offset matches cabinet config in database
- [ ] Listener is running and connected
- [ ] WebSocket is connected on frontend
