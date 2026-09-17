<?php

namespace App\Ai\Tools;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

class StartCoughCaptureTool implements Tool
{
    /**
     * The wire name the model calls and the controllers key off of. Explicit because
     * ToolNameResolver falls back to the PHP class basename ("StartCoughCaptureTool")
     * when a tool has no name() method, which would not match "start_cough_capture".
     */
    public function name(): string
    {
        return 'start_cough_capture';
    }

    /**
     * Get the description of the tool's purpose.
     */
    public function description(): Stringable|string
    {
        return 'Starts the cough sample recording: the patient hears a cue and coughs twice toward '
            .'the microphone. Call this exactly once when it is time for the cough sample; do not ask '
            .'the patient to record manually.';
    }

    /**
     * Execute the tool. The interface records and submits the sample automatically once this is
     * called — the return value only confirms the call to the model, it triggers no side effect here.
     */
    public function handle(Request $request): Stringable|string
    {
        return 'Recording started. The interface will capture and submit the sample automatically.';
    }

    /**
     * Get the tool's schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        return [];
    }
}
