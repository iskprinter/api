import Type from 'src/models/Type'

class StationTradingController {

  async getAllTypes(): Promise<Type[]> {
    return Type.find({});
  }

}

export default new StationTradingController();
