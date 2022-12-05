export interface Database {
    connect(): Promise<Database>,
    find<T>(collectionName: string, query: object): Promise<Array<T>>,
}
