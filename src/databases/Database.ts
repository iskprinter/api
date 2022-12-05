export interface Database {
    connect(): Promise<Database>
}
