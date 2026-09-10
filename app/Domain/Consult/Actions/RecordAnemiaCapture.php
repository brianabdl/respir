<?php

namespace App\Domain\Consult\Actions;

use App\Models\Consultation;
use App\Models\ConsultCapture;
use Illuminate\Http\UploadedFile;

class RecordAnemiaCapture
{
    /**
     * Store a palm/eye/fingernail image as a consultation capture.
     */
    public function store(Consultation $consultation, UploadedFile $file, string $part): ConsultCapture
    {
        $path = $file->store('captures', 'local');

        return $consultation->captures()->create([
            'type' => $part,
            'path' => $path,
            'disk' => 'local',
            'mime_type' => (string) $file->getMimeType(),
            'captured_at' => now(),
        ]);
    }
}
