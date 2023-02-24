# Espruino Web Led

This project was made basically in order to explore the possibilities of Espruino firmware.
The `index.js` contains logic of several modes of operation of the LED strip, e.g. blink, rainbow, running dots. These modes can be changed through the web interface.
The html page also displays information about the temperature and humidity in the room from the connected DHT22 sensor.

On first boot the wifi starts in access point mode with `Espruino_Server` SSID.
Connect to it and type `192.168.4.1` in the browser to open web interface.

If you wish to connect to an existing wifi network you need open `/wifi` page, type SSID and password, click submit and reboot the microcontroller.

## Used hardware

1. [ESP8266 NodeMCU microcontroller](https://aliexpress.ru/item/32520574539.html?sku_id=59096362340&spm=a2g2w.productlist.search_results.0.32fd4aa6JYIUfF)
2. [WS2812 led strip](https://aliexpress.ru/item/32963792469.html?sku_id=66538506334&spm=a2g2w.productlist.search_results.19.5dd64aa66B33e3)
3. [DHT22 module](https://aliexpress.ru/item/32716996619.html?sku_id=61101408537&spm=a2g2w.productlist.search_results.8.1ce44aa6WNwtH8)

## Run the project on microcontroller

### Flashing esp8266 with espruino

We will use [Espruino](https://www.espruino.com/) to programming ESP8266 microcontroller on JavaScript language.
There is a [page](https://www.espruino.com/EspruinoESP8266) with the features and limitations of this firmware on esp8266. Implemented JavaScript features in espruino can be found [here](https://www.espruino.com/Features).

If you try to flash the microcontroller first time, you may need to install [driver](https://myrobot.ru/downloads/driver-ch340g-nodemcu.php) for CH340. NodeMCU usually has this microschema on the board, but if your has another chip, e.g PL2303HX or CP2102, then you need to install driver for yours.

NodeMCU module do not require special preparation for flashing as for ESP-01, and you do not need USB-TTL adapter. Just connect module to your PC via USB cable and execute the command
```
$ /path/to/esptool/esptool.py --port /dev/ttyUSB0 --baud 115200 \
  write_flash --flash_freq 80m --flash_mode qio --flash_size 32m \
  0x0000 "boot_v1.6.bin" 0x1000 espruino_esp8266_user1.bin \
  0x3FC000 esp_init_data_default.bin 0x3FE000 blank.bin
```

You may find more information about flashing [here](https://www.espruino.com/ESP8266_Flashing).

### Connect hardware to NodeMCU

By default the led strip is connected to pin 12 (D6) and DHT22 is connected to pin 13 (D7). You may change this at any time, just change variables `LED_STRIP_PIN` and `DHT_PIN` in the code. Please note, not all pins are available for connection of external hardware.
The full connection schema is following:
* LED: connect power to VIN, gnd to gnd, dat to D6 (pin 12)
* DHT22: connect power to 3v pin, gnd to gnd, dat to D7 (pin13)

### Send js code to esp8266

1. Open [Web IDE](https://www.espruino.com/ide/)
2. Click the connect button at the left top corner
3. Choose the port which microcontroller connected to
4. If everything is ok you go to REPL mode
5. Copy the code to the right part of window
6. Change destination to flash (arrow near icon in the middle of window) and click on this button to start flashing
