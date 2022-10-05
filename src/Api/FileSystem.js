import fs from "fs";

class FileSystem{
  constructor() {
    this.ruta = `./DB/fakeProducts.json`;
  };

    async listarProductos() {
      try {
        const file = await fs.promises.readFile(this.ruta);
        return JSON.parse(file);
      } catch (error) {
        await fs.promises.writeFile(this.ruta, JSON.stringify([]));
        return [];
      }
    };
    
}

export {FileSystem}