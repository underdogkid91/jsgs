import getGraphicsFunctions from './graphics.lib';
import getSoundFunctions from './sound.lib';
import mathLib from './math.lib';
import readCartridge from './readCartridge.lib';
import exampleCode from '../exampleCartridges/exampleCode';

export default class OS {
  constructor(machine) {
    this.$ = {};
  }

  sendEvent(type, machine, payload) {
    switch (type) {
      case 'boot':
        this.boot(machine);
        break;

      case 'cartridgeMount':
        this.boot(machine).then(
          () => this.cartridgeMount(machine)
        );
        break;

      case 'cartridgeEject':
        this.boot(machine).then(
          () => this.cartridgeEject(machine)
        );
        break;
    }

    return this;
  }

  boot(machine) {
    if (this.bootProgress) return this.bootProgress;
    this.bootProgress = new Promise(resolve => {
      this.$ = Object.assign(
        this.$,
        machine.devices.ram.api,
        mathLib,
        getGraphicsFunctions(machine.devices.ram),
        getSoundFunctions(machine.devices.ram),
        machine.devices.controller.api,
      );

      // flush defaults to ram
      this.$.clip();
      this.$.color(6);

      // return resolve(this); // DEVELOPMENT

      let i = 1;

      const loadingAnim = setInterval(() => {
        this.$.cls();
        if (i >= 98) {
          clearInterval(loadingAnim);
          resolve(this);
        } else {
          this.$.print("javascript gaming system", 4, 4, 8);
          if (i >= 20) this.$.print("checking devices", 4, 12, 7);

          if (i >= 40) {
            this.$.print('booting' + '.'.repeat(Math.floor((i-40) / 15)), 4, 20, 7);
          }

          i += parseInt(Math.random() * 2);
        }
      }, 10);
    });

    return this.bootProgress;
  }

  cartridgeMount(machine) {
    const { cartridge } = machine.devices;

    this.$.print("reading cartridge", 4, 4, 7);

    this
      .loadCartridge(cartridge, machine)
      .then(cartridgeData =>
        setTimeout(() => this.runCartridge(cartridgeData), 500)
      );
  }

  cartridgeEject(machine) {
    console.log('ejected', machine);
  }

  loadCartridge(url, machine) {
    const png = new PngToy();

    return (
      png
        .fetch(url)
        .then(() => png.decode().then(readCartridge))
        .then(cartridgeData => {
          let gfxi = 0;
          const gfxData = cartridgeData.gfx + cartridgeData.map + cartridgeData.gff;
          for (let x = 0x0000; x <= 0x30ff; x++) {
            machine.devices.ram.poke(x,
              parseInt(`${gfxData[gfxi]}${gfxData[gfxi+1]}`, 16)
            );
            gfxi = gfxi + 2;
          }

          let sfxi = 0;
          for (let x = 0x3200; x <= 0x42ff; x++) {
            machine.devices.ram.poke(x,
              parseInt(`${cartridgeData.sfx[sfxi]}${cartridgeData.sfx[sfxi+1]}`, 16)
            );
            sfxi = sfxi + 2;
          }

          return cartridgeData;
        })
    );
  }

  runCartridge(____cartridgeData____) {
    this.$.cls();
    const ____BLACKLIST____ =
      Object
        .keys(window)
        .join()
        .replace('console', '_');

    const ____self____ = this;
    const ____api____ = Object.keys(this.$).map(key => {
      return `
        function ${ key }() {
          return ____self____.$['${key}'].apply(null, arguments);
        }
      `;
    });

    ____cartridgeData____.code = exampleCode;

    // try {
      /*h*/eval(`
        (function(${____BLACKLIST____}) {
          ${ ____api____.join(';') }

          function _init() {}
          function _update() {}
          function _draw() {}

          ${ ____cartridgeData____.code }

          _init()
          _update();
          _draw();

          ____self____._draw = _draw;
          ____self____._update = _update;
        })();
       `);
    // } catch (e) {
    //   this.$.print(e.message, 2, 10, 7);
    //   console.error(e);
    // }
  }

  _update() {}
  _draw() {}

  update() {
    this._update();
    this._draw();
  }
}
