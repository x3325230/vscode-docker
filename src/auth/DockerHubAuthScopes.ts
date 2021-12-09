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

export function scopeIsMet(desiredScope: DockerHubAuthScope, availableScope: DockerHubAuthScope): boolean {
    const desiredScopeIndex = allScopes.indexOf(desiredScope);
    const availableScopeIndex = allScopes.indexOf(availableScope);

    if (desiredScopeIndex < 0 || availableScopeIndex < 0) {
        throw new Error('Invalid scope requested.');
    }

    return availableScopeIndex <= desiredScopeIndex; // If the scope of the token we have has equal or less index to what is desired, then it has equal or greater access, and satisfies the desired
}
