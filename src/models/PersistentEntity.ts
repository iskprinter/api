export interface PersistentEntity {

    save(): Promise<PersistentEntity>;

}
