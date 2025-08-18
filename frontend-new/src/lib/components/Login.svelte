<script lang="ts">
    import { onMount } from 'svelte';
    import { userStore } from '$lib/stores';
    import { signInWithGoogle, signOutUser } from '$lib/auth';
    import { scale } from 'svelte/transition';
	import FallbackAvatar from './FallbackAvatar.svelte';

    let isPopupOpen = false;
    let containerEl: HTMLDivElement;

    function togglePopup() {
        isPopupOpen = !isPopupOpen;
    }

    function closePopup() {
        isPopupOpen = false;
    }

    const handleClickOutside = (event: MouseEvent) => {
        if (isPopupOpen && containerEl && !containerEl.contains(event.target as Node)) {
            closePopup();
        }
    };

    onMount(() => {
        window.addEventListener('click', handleClickOutside, true);
    });
</script>

<div class="auth-container" bind:this={containerEl}>
    {#if $userStore}
        <div class="profile-container">
            <button class="avatar-button" on:click={togglePopup} aria-label="Open user menu">
                <FallbackAvatar name={$userStore.displayName || "Guest"} size={27} />
            </button>

            {#if isPopupOpen}
                <div class="popup-menu" transition:scale={{ duration: 150, start: 0.95 }}>
                    <div class="popup-header">
                        <strong>{$userStore.displayName}</strong>
                        <span class="email">{$userStore.email}</span>
                    </div>
                    <hr />
                    <button class="popup-item" on:click={signOutUser}>
                        Sign Out
                    </button>
                </div>
            {/if}
        </div>
    {:else}
        <button class="auth-button sign-in" on:click={signInWithGoogle}>
            <span>Sign in</span>
        </button>
    {/if}
</div>

<style>
    .auth-container {
        position: absolute;
        right: 15px;
        top: 13.5px;
    }

    .auth-button {
        display: flex;
        align-items: center;
        gap: 12px;
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.5);
        background: rgba(255, 255, 255, 0.1);
        color: white;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    .auth-button:hover {
        background: rgba(255, 255, 255, 0.2);
    }

    .profile-container {
        position: relative;
        top: 6px;
        right: 45px;
    }

    .avatar-button {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        border-radius: 50%;
        display: block;
    }

    .popup-menu {
        position: absolute;
        top: calc(100% + 10px); /* Position below the avatar with a 10px gap */
        right: 0;
        background: #2c2c2e; /* A dark, iOS-like background */
        color: white;
        border-radius: 12px;
        width: 220px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        transform-origin: top left; /* Makes the scale transition look better */
        padding: 8px;
    }

    .popup-header {
        padding: 8px 12px;
        display: flex;
        flex-direction: column;
    }

    .popup-header .email {
        font-size: 0.8rem;
        color: #8e8e93; /* A lighter grey for the email */
        margin-top: 2px;
    }

    .popup-menu hr {
        border: none;
        height: 1px;
        background-color: rgba(255, 255, 255, 0.1);
        margin: 8px 0;
    }

    .popup-item {
        width: 100%;
        background: none;
        border: none;
        color: white;
        padding: 10px 12px;
        text-align: left;
        font-size: 0.95rem;
        cursor: pointer;
        border-radius: 8px;
        transition: background-color 0.2s;
    }

    .popup-item:hover {
        background-color: rgba(255, 255, 255, 0.1);
    }
</style>