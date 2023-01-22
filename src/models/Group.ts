import { DataProxy } from "src/services";
import GroupData from "./GroupData";
import Model from "./Model";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Group extends GroupData { }
class Group extends Model implements GroupData {
  constructor(dataProxy: DataProxy, groupData: GroupData) {
    super(dataProxy);
    Object.assign(this, groupData);
  }
}
export default Group;
