/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { DockerHubAccountTreeItem } from '../tree/registries/dockerHub/DockerHubAccountTreeItem';
import { registryExpectedContextValues } from '../tree/registries/registryContextValues';
import { ErrorHandling, httpRequest, RequestOptionsLike } from '../utils/httpRequest';
import { DockerHubAuthScope, scopesAreMet } from './DockerHubAuthScopes';

interface DockerHubToken {
    /* eslint-disable @typescript-eslint/naming-convention */
    session_id: string;
    username: string;
    user_id: string;
    scope: DockerHubAuthScope;
    /* eslint-enable @typescript-eslint/naming-convention */
    // Other properties exist but they are not used
}

export class DockerHubAuthenticationProvider implements vscode.AuthenticationProvider {
    private readonly sessionChangeEmitter = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();
    private readonly sessions = new Map<string, vscode.AuthenticationSession>();

    /**
     * An event when sessions are changed
     */
    public readonly onDidChangeSessions = this.sessionChangeEmitter.event;

    /**
     * Gets the sessions for this provider
     * @param scopes The desired scope(s)
     * @returns A list of sessions that each contain all of the desired scope(s), if given, otherwise all sessions
     */
    public async getSessions(scopes?: readonly string[]): Promise<readonly vscode.AuthenticationSession[]> {
        const desiredScopes = scopes as DockerHubAuthScope[];
        const sessions = Array.from(this.sessions.values());
        if (scopes?.length) {
            return sessions.filter(session => scopesAreMet(desiredScopes, session.scopes as DockerHubAuthScope[]));
        }

        return sessions;
    }

    /**
     * Create a session by requesting a token. If the desired scope(s) cannot be met, this will fail.
     * @param scopes The desired scope(s)
     */
    public async createSession(scopes: readonly string[]): Promise<vscode.AuthenticationSession> {
        const desiredScopes = scopes as DockerHubAuthScope[];

        const account = await this.chooseAccount();
        const token = await this.acquireToken(account.username, await account.getPassword());
        const parsedToken = this.parseToken(token);

        if (!scopesAreMet(desiredScopes, [parsedToken.scope])) {
            throw new Error('Unable to obtain token with desired scope(s).');
        }

        const newSession: vscode.AuthenticationSession = {
            id: parsedToken.session_id,
            accessToken: token,
            account: {
                id: parsedToken.user_id,
                label: parsedToken.username,
            },
            scopes: [parsedToken.scope],
        };

        this.sessions.set(parsedToken.session_id, newSession);
        this.sessionChangeEmitter.fire({
            added: [newSession],
        });

        return newSession;
    }

    /**
     * Removes a session
     * @param sessionId The session ID to remove
     */
    public async removeSession(sessionId: string): Promise<void> {
        // Nothing needs to be done except remove the session from memory--there is no logout
        const session: vscode.AuthenticationSession | undefined = this.sessions.get(sessionId);
        if (session) {
            this.sessions.delete(sessionId);
            this.sessionChangeEmitter.fire(
                {
                    removed: [session],
                }
            );
        }
    }

    private async chooseAccount(): Promise<DockerHubAccountTreeItem> {
        return await callWithTelemetryAndErrorHandling('pickDockerHub', async (context: IActionContext) => {
            context.telemetry.suppressAll = true;
            context.errorHandling.suppressReportIssue = true;

            return await ext.registriesTree.showTreeItemPicker<DockerHubAccountTreeItem>(
                registryExpectedContextValues.dockerHub.registry,
                {
                    ...context,
                    suppressCreatePick: true,
                    canPickMany: false,
                    noItemFoundErrorMessage: localize('vscode-docker.auth.dockerHub.noDockerHubConnection', 'No Docker Hub connection found. Add a connection with the command "Docker Registries: Connect Registry..." and choose Docker Hub.'),
                }
            );
        });
    }

    private async acquireToken(username: string, password: string): Promise<string> {
        const url = 'https://hub.docker.com/v2/users/login';
        const body = { username, password };
        const requestOptions: RequestOptionsLike = {
            method: 'POST',
            body: JSON.stringify(body),
            headers: { 'Content-Type': 'application/json' }
        };

        const response = await httpRequest<{ token: string }>(url, requestOptions, /* signRequest?: */ undefined, ErrorHandling.ThrowOnError);

        return (await response.json()).token;
    }

    private parseToken(token: string): DockerHubToken {
        const parsedToken = JSON.parse(token) as DockerHubToken;

        if (!parsedToken.session_id ||
            !parsedToken.username ||
            !parsedToken.user_id ||
            parsedToken.scope === undefined || parsedToken.scope === null) { // Scope can be '' which is falsy, so need to explicitly check if it's undefined/null rather than any falsy value
            throw new Error('Unable to parse Docker Hub token.');
        }

        return parsedToken;
    }
}
