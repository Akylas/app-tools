import SqlQuery from 'kiss-orm/dist/Queries/SqlQuery';
import DatabaseInterface from 'kiss-orm/dist/Databases/DatabaseInterface';
import migrate from 'kiss-orm/dist/Databases/Common/migrate';
import { DatabaseOptions, SQLiteDatabase, openOrCreate } from '@nativescript-community/sqlite-core';
import { NoSpaceLeftError } from '@akylas/nativescript-app-utils/error';

function formatIdentifier(i: string): string {
    return i;
}

export default class NSQLDatabase implements DatabaseInterface {
    db: SQLiteDatabase;
    constructor(filePath: string, options?: DatabaseOptions) {
        // opens in the background: an open error is reported by the first query
        this.db = openOrCreate(filePath, options);
    }

    async disconnect(): Promise<void> {
        return this.db.close();
    }
    isOpen(): boolean {
        return this.db.isOpen;
    }

    indexToPlaceholder(i: number): string {
        return '?';
    }

    wrapAndThrowError(error) {
        // SQLITE_FULL (13), SQLITE_IOERR_FSYNC (1034), or the OS message
        if (error && (error.code === 13 || error.extendedCode === 1034 || /SQLITE_IOERR_FSYNC|ENOSPC|disk is full/.test(String(error)))) {
            throw new NoSpaceLeftError(error);
        } else {
            throw error;
        }
    }

    async query(query: SqlQuery): Promise<any[]> {
        const compiledQuery = query.compile(this.indexToPlaceholder, formatIdentifier);
        const sqlQuery = compiledQuery.sql.trim();
        try {
            const result = await this.db.select(sqlQuery, compiledQuery.params);
            return result as any[];
        } catch (error) {
            this.wrapAndThrowError(error);
        }
    }
    async sequence<T>(sequence: (sequenceDb: NSQLDatabase) => Promise<T>): Promise<T> {
        return sequence(this);
    }

    async migrate(migrations: { [key: string]: SqlQuery }) {
        await migrate(this, migrations);
    }

    async insertAndGet(standardInsertQuery: SqlQuery): Promise<number[] | string[] | any[]> {
        const compiledQuery = standardInsertQuery.compile(this.indexToPlaceholder, formatIdentifier);
        const sqlQuery = compiledQuery.sql.trim();
        try {
            await this.db.execute(sqlQuery, compiledQuery.params);
            // no id: kiss-orm then builds the model from the inserted attributes (the primary key is not always the rowid)
            return [undefined];
        } catch (error) {
            this.wrapAndThrowError(error);
        }
    }

    async updateAndGet(standardUpdateQuery: SqlQuery): Promise<null | any[]> {
        const compiledQuery = standardUpdateQuery.compile(this.indexToPlaceholder, formatIdentifier);
        const sqlQuery = compiledQuery.sql.trim();
        try {
            await this.db.execute(sqlQuery, compiledQuery.params);
            // null: kiss-orm then selects the updated row itself
            return null;
        } catch (error) {
            this.wrapAndThrowError(error);
        }
    }
}
