<?php

use App\Models\Consultation;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

Broadcast::channel('consultation.{consultation}', function (User $user, Consultation $consultation): bool {
    return $user->id === $consultation->user_id || $user->isDoctor();
});
