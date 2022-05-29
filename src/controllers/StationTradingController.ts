import Type from 'src/entities/Type'

class StationTradingController {

  async getAllTypes(): Promise<Type[]> {
    return Type.find({});
  };

};

export default new StationTradingController();
