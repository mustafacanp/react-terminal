import { FSEntry } from '../enums';

// String manipulation utilities
export const trim = str => str.trimStart().trimEnd();
export const removeSpaces = text => text.replace(/\s+/g, ' ').trim();

// File system utilities
export const isDir = obj =>
	!!(obj && FSEntry.parse(obj.type) === FSEntry.DIRECTORY);
export const isFile = obj =>
	!!(obj && FSEntry.parse(obj.type) === FSEntry.FILE);

// Command parameter utilities
export const getFirstParameter = str => trim(str).split(' ')[0];
export const getSecondParameter = str => trim(str).split(' ')[1] || '';

// Parameter validation utilities
export const hasSecondParameter = str => !!getSecondParameter(str);
export const hasTooManyParameters = str => trim(str).split(' ').length > 2;

// File system navigation utility
export const resolveFileSystemPath = (
	rootFileSystem,
	currentFileSystem,
	currentPath,
	targetPath
) => {
	if (!targetPath || targetPath === '.') return currentFileSystem;

	const pathParts = targetPath.split('/').filter(part => part !== '');
	let current = currentFileSystem;
	let workingPath = [...currentPath]; // Copy current path

	for (const part of pathParts) {
		if (part === '..') {
			// Go up one directory
			if (workingPath.length > 0) {
				workingPath.pop();
				// Navigate to the parent directory from root
				current = rootFileSystem;
				for (const pathSegment of workingPath) {
					if (current.children && current.children[pathSegment]) {
						current = current.children[pathSegment];
					} else {
						return null; // Path not found
					}
				}
			} else {
				// Already at root, can't go up further
				current = rootFileSystem;
			}
		} else {
			// Normal directory navigation
			if (!current || !current.children || !current.children[part]) {
				return null; // Path not found
			}
			current = current.children[part];
			workingPath.push(part);
		}
	}

	return current;
};
