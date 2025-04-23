<script>
    export let data;

    let selectedTokenId = '';
    let assignedEndpoints = [];

    import { onMount } from 'svelte';
    let jwt = '';
    let expiryTime = '';

    async function refreshToken() {
        const formData = new FormData();
        const response = await fetch('?/refresh-token', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        jwt = JSON.parse(result.data)[1];
        updateExpiryTime();
    }

    function updateExpiryTime() {
        if (jwt) {
            const payload = JSON.parse(atob(jwt.split('.')[1]));
            expiryTime = new Date(payload.exp * 1000).toLocaleString();
        } else {
            expiryTime = 'No token generated yet';
        }
    }

    function copyToken() {
        if (jwt) {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(jwt).then(() => {
                    alert('Token copied to clipboard!');
                });
            } else {
                // Fallback for environments where navigator.clipboard is undefined
                const textarea = document.createElement('textarea');
                textarea.value = jwt;
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand('copy');
                    alert('Token copied to clipboard!');
                } catch (err) {
                    alert('Failed to copy token.');
                }
                document.body.removeChild(textarea);
            }
        }
    }

    onMount(() => {
        updateExpiryTime();
    });
</script>

<style>
    :global(body) {
        font-family: Arial, sans-serif;
        background-color: #f0f0f0;
        color: #333;
    }
    :root {
        --spacing: 1rem;
        --color-bg: #f9fafb;
        --color-card: #ffffff;
        --color-border: #e5e7eb;
        --color-primary: #3b82f6;
        --color-primary-hover: #2563eb;
        --color-text: #111827;
        --radius: 0.5rem;
        --shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        --control-height: 2.5rem;
        --control-line-height: 1.5;
    }

    main {
        margin: 0;
        padding: var(--spacing);
        background-color: var(--color-bg);
        display: flex;
        flex-direction: column;
        gap: var(--spacing);
    }

    .top-section {
        width: 100%;
    }

    .side-by-side {
        display: flex;
        gap: var(--spacing);
        width: 100%;
    }

    .side-by-side > section {
        flex: 1;
    }

    .card {
        background-color: var(--color-card);
        border: 1px solid var(--color-border);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        padding: var(--spacing);
    }

    .heading {
        font-size: 1.75rem;
        color: var(--color-text);
        margin-bottom: var(--spacing);
    }

    .form-inline {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--spacing);
        margin-bottom: var(--spacing);
    }

    /* Uniform control sizing */
    input,
    select,
    button {
        font-size: 1rem;
        line-height: var(--control-line-height);
        height: var(--control-height);
        padding: 0 0.75rem;
        border-radius: var(--radius);
        border: 1px solid var(--color-border);
    }

    /* Multi-select specific sizing */
    .form-inline select[multiple] {
        /* limit multi-select height */
        max-height: calc(var(--control-height) * 3);
        overflow-y: auto;
        height: auto;
    }

    /* Update Tokens form: stack items */
    .token-list {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--spacing);
        width: 100%;
        padding-top: var(--spacing);
        border-top: 1px solid var(--color-border);
    }

    .token-list label {
        margin: 0;
    }

    .token-list select {
        width: 100%;
        max-width: 100%;
        max-height: calc(var(--control-height) * 3);
        height: auto;
    }

    .token-list button {
        align-self: flex-start;
        margin-top: 0;
    }

    button {
        background-color: var(--color-primary);
        color: #fff;
        cursor: pointer;
        transition: background-color 0.2s ease-in-out;
    }

    button:hover {
        background-color: var(--color-primary-hover);
    }

    ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }

    li:not(:last-child) {
        margin-bottom: var(--spacing);
    }

    .endpoint-details {
        margin-bottom: var(--spacing);
        line-height: 1.5;
    }

    /* Ensure consistent select arrow alignment */
    select {
        background-color: #fff;
        background-image: none;
    }

    .token-text {
        word-wrap: break-word;
        overflow-wrap: break-word;
    }
</style>

<main>
    <section class="card top-section">
        <h2 class="heading">User Auth Token</h2>
        <p><strong>Expires At:</strong> {expiryTime}</p>
        <p><strong>Token:</strong> <span class="token-text">{jwt || 'No token generated yet'}</span></p>
        <button on:click={refreshToken}>Refresh Token</button>
        <button on:click={copyToken} disabled={!jwt}>Copy Token</button>
    </section>

    <div class="side-by-side">
        <section class="card">
            <h2 class="heading">Tokens</h2>

            <form method="post" action="?/add-token" class="form-inline">
                <input
                    type="text"
                    name="name"
                    placeholder="Token Name"
                    required
                />
                <button type="submit">Add Token</button>
            </form>

            {#if data.tokens.length > 0}
                <ul>
                    {#each data.tokens as token}
                        <li class="card">
                            <div><strong>Token:</strong> {token.token}</div>
                            <div><strong>Name:</strong> {token.name}</div>
                            <form method="post" action="?/delete-token" class="form-inline">
                                <input type="hidden" name="tokenId" value={token.id} />
                                <button type="submit">Delete</button>
                            </form>

                            <form method="post" action="?/update-token-endpoints" class="token-list">
                                <input type="hidden" name="tokenId" value={token.id} />
                                <label for="endpoints">Assign Endpoints:</label>
                                <select name="endpoints" multiple>
                                    {#each data.endpoints as endpoint}
                                        <option
                                            value={endpoint.id}
                                            selected={token.endpoints?.some(e => e.id === endpoint.id)}
                                        >
                                            {endpoint.endpoint}
                                        </option>
                                    {/each}
                                </select>
                                <button type="submit">Update Endpoints</button>
                            </form>
                        </li>
                    {/each}
                </ul>
            {:else}
                <p>No tokens available.</p>
            {/if}
        </section>

        <section class="card">
            <h2 class="heading">Endpoints</h2>

            <form method="post" action="?/add-endpoint" class="form-inline">
                <select name="method" required>
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                </select>
                <input
                    type="text"
                    name="endpoint"
                    placeholder="Endpoint"
                    required
                />
                <input
                    type="text"
                    name="remote_endpoint"
                    placeholder="Remote Endpoint"
                    required
                />
                <button type="submit">Add Endpoint</button>
            </form>

            {#if data.endpoints.length > 0}
                <ul>
                    {#each data.endpoints as endpoint}
                        <li class="card">
                            <div class="endpoint-details">
                                <div><strong>Endpoint:</strong> {endpoint.endpoint}</div>
                                <div><strong>Remote:</strong> {endpoint.remote_endpoint}</div>
                                <div><strong>Method:</strong> {endpoint.method}</div>
                                <div><strong>ID:</strong> {endpoint.id}</div>
                            </div>
                            <form method="post" action="?/delete-endpoint" class="form-inline">
                                <input type="hidden" name="endpointId" value={endpoint.id} />
                                <button type="submit">Delete</button>
                            </form>
                        </li>
                    {/each}
                </ul>
            {:else}
                <p>No endpoints available.</p>
            {/if}
        </section>
    </div>
</main>
