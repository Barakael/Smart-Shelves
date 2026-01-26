from __future__ import annotations

import logging
import time
from dataclasses import dataclass

from ..config import get_settings

try:
    import RPi.GPIO as GPIO  # type: ignore
except Exception:  # pragma: no cover - dev machines will not have GPIO
    GPIO = None  # type: ignore

logger = logging.getLogger(__name__)


@dataclass
class HardwareResult:
    gpio_pin: int
    triggered: bool
    message: str


class ShelfHardwareDriver:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.use_mock = GPIO is None
        if not self.use_mock:
            GPIO.setmode(GPIO.BCM)
            GPIO.setwarnings(False)

    def trigger(self, gpio_pin: int) -> HardwareResult:
        pulse_seconds = self.settings.gpio_pulse_ms / 1000

        if self.use_mock:
            logger.info('Mock GPIO trigger', extra={'gpio_pin': gpio_pin, 'pulse_s': pulse_seconds})
            time.sleep(pulse_seconds)
            return HardwareResult(gpio_pin=gpio_pin, triggered=True, message='Mock trigger executed')

        GPIO.setup(gpio_pin, GPIO.OUT)
        GPIO.output(gpio_pin, GPIO.HIGH)
        time.sleep(pulse_seconds)
        GPIO.output(gpio_pin, GPIO.LOW)
        logger.info('GPIO trigger completed', extra={'gpio_pin': gpio_pin, 'pulse_s': pulse_seconds})
        return HardwareResult(gpio_pin=gpio_pin, triggered=True, message='Relay pulse sent')

    def cleanup(self) -> None:
        if not self.use_mock and GPIO:
            GPIO.cleanup()
