import { MongoClient, Collection, FilterQuery, Cursor } from 'mongodb';

export class Type {

    static DB_NAME = 'isk-printer';
    static COLLECTION_NAME = 'types';

    constructor(
        private typeId: number,
        private typeName: string
    ) {}

    static async find(query: FilterQuery<any>): Promise<Type[]> {
        return this.withCollection(async (collection) => {
            return (await collection.find(query).toArray()).map((type) => {
                delete type._id;
                return type;
            });
        });
    }

    static async withCollection(next: (collection: Collection<any>) => Promise<any>): Promise<any> {

        const dbUrl = process.env.DB_URL;
        if (!dbUrl) {
            throw new Error("Environment variable 'DB_URL' is undefined.");
        }
        const client = new MongoClient(dbUrl, { useUnifiedTopology: true });
        await client.connect();
        const db = await client.db(Type.DB_NAME);
        const collection = await db.collection(Type.COLLECTION_NAME);

        const dbResponse = await next(collection);
    
        await client.close();

        return dbResponse;
    }

}
