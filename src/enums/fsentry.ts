interface FSEntryType {
    name: string;
    toString: () => string;
    valueOf: () => string;
}

const toEnum = (name: string): FSEntryType =>
    Object.freeze({
        name: name,
        toString: () => name,
        valueOf: () => name
    });

export const FSEntry = Object.freeze({
    DIRECTORY: toEnum('directory'),
    FILE: toEnum('file'),
    parse(value: string | { name: string } | undefined): FSEntryType | undefined {
        if (!value) return;
        const key = typeof value === 'string' ? value : value.name;
        const upperKey = key.toUpperCase();

        if (upperKey === 'DIRECTORY') return this.DIRECTORY;
        if (upperKey === 'FILE') return this.FILE;

        return undefined;
    }
});
