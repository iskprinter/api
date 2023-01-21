export default interface PersistentEntity {

  save(): Promise<PersistentEntity>;

}
