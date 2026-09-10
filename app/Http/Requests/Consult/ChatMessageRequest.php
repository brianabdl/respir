<?php

namespace App\Http\Requests\Consult;

use App\Models\Consultation;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ChatMessageRequest extends FormRequest
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
            'new_session' => ['nullable', 'boolean'],
            'message' => ['required', 'string', 'max:4000'],
        ];
    }
}
