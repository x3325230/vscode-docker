/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// All Docker Hub auth token scopes, in descending order of permission
const allScopes = [
    '',
    'repo:admin',
    'repo:write',
    'repo:read',
    'repo:public_read',
] as const;

type scopeTuple = typeof allScopes;
export type DockerHubAuthScope = scopeTuple[number];

/**
 * Checks if all of the desired scopes are in the available scopes
 * @param desiredScopes The desired scopes
 * @param availableScopes The available scopes
 * @returns True if the available scopes meet all of the desired scopes, false otherwise
 */
export function scopesAreMet(desiredScopes: DockerHubAuthScope[], availableScopes: DockerHubAuthScope[]): boolean {
    // First, validate that all the scopes are actually valid
    if (desiredScopes.some(ds => !allScopes.includes(ds)) ||
        availableScopes.some(as => !allScopes.includes(as))) {
        throw new Error('Invalid scope requested.');
    }

    const highestDesiredScopeIndex = getHighestScopeIndex(desiredScopes);
    const highestAvailableScopeIndex = getHighestScopeIndex(availableScopes);

    return highestAvailableScopeIndex <= highestDesiredScopeIndex; // If the scope of the token we have has equal or less index to what is desired, then it has equal or greater access, and satisfies the desired
}

/**
 * Given a list of scopes, finds the scope with the highest permission and returns its index in allScopes
 * @param scopes The list of scopes
 */
function getHighestScopeIndex(scopes: DockerHubAuthScope[]): number {
    let highestScopeIndex: number = allScopes.length;

    for (const scope of scopes) {
        const scopeIndex = allScopes.indexOf(scope);

        if (scopeIndex < highestScopeIndex) {
            highestScopeIndex = scopeIndex;
        }
    }

    return highestScopeIndex;
}
