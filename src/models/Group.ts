import { DataProxy } from "src/services";
import GroupData from "./GroupData";
import EveModel from "./EveModel";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Group extends GroupData { }
class Group extends EveModel implements GroupData {
  constructor(dataProxy: DataProxy, groupData: GroupData) {
    super(dataProxy);
    Object.assign(this, groupData);
  }
}
export default Group;
