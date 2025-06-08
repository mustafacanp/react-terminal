const toEnum = name =>
	Object.freeze({
		name: name,
		toString: () => name,
		valueOf: () => name
	});

export const FSEntry = Object.freeze({
	DIRECTORY: toEnum('directory'),
	FILE: toEnum('file'),
	parse(value) {
		if (!value) return;
		if (
			(typeof value === 'string' && this.hasOwnProperty(value.toUpperCase())) ||
			(typeof value === 'object' &&
				value.name &&
				this.hasOwnProperty(value.name.toUpperCase()))
		) {
			return this[value.toUpperCase()];
		}
	}
});
