import env from 'env-var';
import { MongoClient } from "mongodb";
import { Database } from "./Database";
import log from 'src/tools/Logger';

export class MongoDb implements Database {
    async connect() {
        const dbUrl = env.get('DB_URL').required().asUrlString();
        const dbClient = new MongoClient(dbUrl)
        log.info(`Connecting to MongoDB at URL ${dbUrl}...`);
        await dbClient.connect();
        return dbClient;
    }
}
