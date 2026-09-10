<?php

namespace App\Domain\Consult\Actions;

use App\Models\Consultation;
use App\Models\ConsultCapture;
use Illuminate\Http\UploadedFile;

class RecordCoughSample
{
    /**
     * Store the recorded cough audio as a consultation capture.
     */
    public function store(Consultation $consultation, UploadedFile $file): ConsultCapture
    {
        $path = $file->store('captures', 'local');

        return $consultation->captures()->create([
            'type' => 'audio',
            'path' => $path,
            'disk' => 'local',
            'mime_type' => (string) $file->getMimeType(),
            'captured_at' => now(),
        ]);
    }
}
