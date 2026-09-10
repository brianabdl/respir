<?php

namespace App\Http\Requests\Consult;

use App\Models\Consultation;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\File;

class VoiceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->route('consultation') instanceof Consultation
            && $this->route('consultation')->user_id === $this->user()->id;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'message' => ['nullable', 'string', 'max:4000'],
            'new_session' => ['nullable', 'boolean'],
            'audio' => [
                'nullable',
                File::types([
                    'audio/webm',
                    'audio/ogg',
                    'audio/mp4',
                    'audio/mpeg',
                    'audio/wav',
                ])->max(8 * 1024),
            ],
        ];
    }
}
