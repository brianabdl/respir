<?php

namespace App\Concerns;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

trait ProfileValidationRules
{
    /**
     * Get the validation rules used to validate user profiles.
     *
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    protected function profileRules(?int $userId = null): array
    {
        return [
            'name' => $this->nameRules(),
            'email' => $this->emailRules($userId),
        ];
    }

    /**
     * Get the validation rules used to validate user names.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function nameRules(): array
    {
        return ['required', 'string', 'max:255'];
    }

    /**
     * Get the validation rules used to validate user emails.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function emailRules(?int $userId = null): array
    {
        return [
            'required',
            'string',
            'email',
            'max:255',
            $userId === null
                ? Rule::unique(User::class)
                : Rule::unique(User::class)->ignore($userId),
        ];
    }

    /**
     * Get the validation rules used to validate the post-registration
     * personalization step (date of birth, contact and emergency details).
     *
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    protected function personalizationRules(): array
    {
        return [
            'date_of_birth' => $this->dateOfBirthRules(),
            'sex' => $this->sexRules(),
            'phone' => $this->phoneRules(),
            'address' => $this->addressRules(),
            'emergency_contact_name' => ['required', 'string', 'max:255'],
            'emergency_contact_phone' => $this->phoneRules(),
            'privacy_policy_accepted' => ['accepted'],
        ];
    }

    /**
     * Get the validation rules used to validate a date of birth.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function dateOfBirthRules(): array
    {
        return ['required', 'date', 'before:today'];
    }

    /**
     * Get the validation rules used to validate sex/gender.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function sexRules(): array
    {
        return ['required', Rule::in(['male', 'female', 'other', 'unknown'])];
    }

    /**
     * Get the validation rules used to validate a phone number.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function phoneRules(): array
    {
        return ['required', 'string', 'max:30', 'regex:/^[0-9+()\-\s]+$/'];
    }

    /**
     * Get the validation rules used to validate a postal address.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function addressRules(): array
    {
        return ['required', 'string', 'max:500'];
    }
}
