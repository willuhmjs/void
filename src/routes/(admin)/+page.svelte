<script>
    import { enhance } from '$app/forms';
    import { onMount } from 'svelte';
    import { invalidateAll } from '$app/navigation';

    export let data;

    let jwt = '';
    let expiryTime = '';
    let isDarkTheme = true;
    let searchQuery = '';
    let notification = { type: '', message: '' };

    // Clears the notification
    function clearNotification() {
        notification = { type: '', message: '' };
    }
    
    // Sets and automatically dismisses a notification
    function showNotification(type, message, duration = 5000) {
        notification = { type, message };
        setTimeout(() => {
            clearNotification();
        }, duration);
    }

    // Toggles Bootstrap's dark/light theme
    function toggleTheme() {
        isDarkTheme = !isDarkTheme;
        document.documentElement.setAttribute('data-bs-theme', isDarkTheme ? 'dark' : 'light');
    }

    async function refreshToken() {
        try {
            const formData = new FormData();
            const response = await fetch('?/refresh-token', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (!response.ok || result.type === 'error') {
                throw new Error(result.message || 'Failed to refresh token.');
            }
            jwt = JSON.parse(result.data)[1];
            updateExpiryTime();
            showNotification('success', 'Token has been refreshed successfully!');
        } catch (error)  {
            showNotification('error', error.message);
        }
    }

    function updateExpiryTime() {
        if (jwt) {
            const payload = JSON.parse(atob(jwt.split('.')[1]));
            expiryTime = new Date(payload.exp * 1000).toLocaleString();
        } else {
            expiryTime = 'No token generated yet';
        }
    }

    // Copies the JWT token to the clipboard
    function copyToken() {
        if (jwt && navigator.clipboard) {
            navigator.clipboard.writeText(jwt).then(() => {
                showNotification('success', 'Token copied to clipboard!');
            }, () => {
                showNotification('error', 'Failed to copy token.');
            });
        }
    }

    // Enhancer function to invalidate data and update UI with notifications
    const enhanceForm = () => {
        return async ({ result }) => {
            if (result.type === 'success') {
                await invalidateAll();
                showNotification('success', result.data?.message || 'Operation successful!');
            } else if (result.type === 'failure') {
                showNotification('error', result.data?.message || 'An error occurred with your submission.');
            } else if (result.type === 'error') {
                showNotification('error', result.error?.message || 'A server error occurred.');
            }
        };
    };

    // Filters tokens based on the search query
    $: filteredTokens = data.tokens.filter(token =>
        token.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Set the initial theme on component mount
    onMount(() => {
        updateExpiryTime();
        document.documentElement.setAttribute('data-bs-theme', isDarkTheme ? 'dark' : 'light');
    });
</script>

<svelte:head>
    <!-- Removes the need for custom styling by relying on Bootstrap -->
    <style>
        .token-text {
            word-wrap: break-word;
            overflow-wrap: break-word;
        }
        .notification-container {
            position: fixed;
            bottom: 1rem;
            right: 1rem;
            z-index: 9999;
        }
    </style>
</svelte:head>

<main class="container-fluid p-3">
    <!-- Notification Display -->
    <div class="notification-container">
        {#if notification.message}
            <div class="alert alert-{notification.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show" role="alert">
                {notification.message}
                <button type="button" class="btn-close" on:click={clearNotification} aria-label="Close"></button>
            </div>
        {/if}
    </div>

    <div class="position-relative">
        <button class="btn btn-outline-secondary position-absolute top-0 end-0" on:click={toggleTheme}>
            Toggle Theme
        </button>
    </div>

    <section class="card mb-3">
        <div class="card-body">
            <h2 class="card-title">User Auth Token</h2>
            <p><strong>Expires At:</strong> {expiryTime}</p>
            <p><strong>Token:</strong> <span class="token-text">{jwt || 'No token generated yet'}</span></p>
            <button class="btn btn-primary" on:click={refreshToken}>Refresh Token</button>
            <button class="btn btn-secondary" on:click={copyToken} disabled={!jwt}>Copy Token</button>
        </div>
    </section>

    <div class="row g-3">
        <div class="col-lg-6">
            <section class="card">
                <div class="card-body">
                    <h2 class="card-title">Tokens</h2>
                    
                    <!-- Add Token Form -->
                    <form method="post" action="?/add-token" class="d-flex gap-2 mb-2" use:enhance={enhanceForm}>
                        <input type="text" name="name" placeholder="Token Name" class="form-control" required />
                        <button type="submit" class="btn btn-primary">Add</button>
                    </form>

                    <input type="text" placeholder="Filter by name..." bind:value={searchQuery} class="form-control mb-3" />

                    <!-- Display Tokens -->
                    <ul class="list-unstyled">
                        {#each filteredTokens as token (token.id)}
                            <li class="card mb-3">
                                <div class="card-body">
                                    <div><strong>Name:</strong> {token.name}</div>
                                    <div class="token-text"><strong>Token:</strong> {token.token}</div>
                                    <form method="post" action="?/update-token-endpoints" class="mt-2" use:enhance={enhanceForm} id="update-token-form-{token.id}">
                                        <input type="hidden" name="tokenId" value={token.id} />
                                        <fieldset>
                                            <legend class="fs-6">Assign Endpoints:</legend>
                                            {#each data.endpoints as endpoint}
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" id="token-{token.id}-endpoint-{endpoint.id}" name="endpoints" value={endpoint.id} checked={token.endpoints?.some(e => e.id === endpoint.id)} />
                                                    <label class="form-check-label" for="token-{token.id}-endpoint-{endpoint.id}">{endpoint.endpoint}</label>
                                                </div>
                                            {/each}
                                        </fieldset>
                                    </form>
                                    <div class="d-flex gap-2 mt-2">
                                        <button type="submit" class="btn btn-success btn-sm" form="update-token-form-{token.id}">Update Endpoints</button>
                                        <form method="post" action="?/delete-token" use:enhance={enhanceForm} class="ms-auto">
                                            <input type="hidden" name="tokenId" value={token.id} />
                                            <button type="submit" class="btn btn-danger btn-sm">Delete</button>
                                        </form>
                                    </div>
                                </div>
                            </li>
                        {/each}
                    </ul>

                    {#if filteredTokens.length === 0}
                        <p>No tokens match your search.</p>
                    {/if}
                </div>
            </section>
        </div>

        <div class="col-lg-6">
            <section class="card">
                <div class="card-body">
                    <h2 class="card-title">Endpoints</h2>
                    <form method="post" action="?/add-endpoint" class="d-flex flex-wrap gap-2 mb-3" use:enhance={enhanceForm}>
                        <select name="method" class="form-select" style="width: auto;" required>
                            <option value="POST">POST</option>
                            <option value="GET">GET</option>
                        </select>
                        <input type="text" name="endpoint" placeholder="/endpoint" class="form-control" style="flex: 1;" required />
                        <input type="text" name="remote_endpoint" placeholder="http://remote/api" class="form-control" style="flex: 1;" required />
                        <button type="submit" class="btn btn-primary">Add</button>
                    </form>

                    {#if data.endpoints.length > 0}
                        <ul class="list-unstyled">
                            {#each data.endpoints as endpoint (endpoint.id)}
                                <li class="card mb-2">
                                    <div class="card-body">
                                        <div><strong>Endpoint:</strong> {endpoint.endpoint}</div>
                                        <div><strong>Remote:</strong> {endpoint.remote_endpoint}</div>
                                        <div><strong>Method:</strong> {endpoint.method}</div>
                                        <div class="d-flex gap-2 mt-2">
                                             <form method="post" action="?/default-endpoint" use:enhance={enhanceForm}>
                                                <input type="hidden" name="endpointId" value={endpoint.id} />
                                                <button type="submit" class="btn btn-secondary btn-sm">Default</button>
                                            </form>
                                            <form method="post" action="?/delete-endpoint" use:enhance={enhanceForm} class="ms-auto">
                                                <input type="hidden" name="endpointId" value={endpoint.id} />
                                                <button type="submit" class="btn btn-danger btn-sm">Delete</button>
                                            </form>
                                        </div>
                                    </div>
                                </li>
                            {/each}
                        </ul>
                    {:else}
                        <p>No endpoints available.</p>
                    {/if}
                </div>
            </section>
        </div>
    </div>
</main>