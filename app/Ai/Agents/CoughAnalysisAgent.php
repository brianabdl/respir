<?php

namespace App\Ai\Agents;

use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Attributes\Provider;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\HasStructuredOutput;
use Laravel\Ai\Enums\Lab;
use Laravel\Ai\Promptable;
use Stringable;

#[Provider(Lab::Gemini)]
class CoughAnalysisAgent implements Agent, HasStructuredOutput
{
    use Promptable;

    /**
     * Get the instructions that the agent should follow.
     */
    public function instructions(): Stringable|string
    {
        return <<<'PROMPT'
            You analyse recorded human cough sounds for signs that warrant a clinic visit.
            You are not a doctor and this is not a diagnosis. Listen to the cough and consider:
            duration and intensity of the recorded cough, whether it sounds dry or productive/wet,
            wheezing, breathlessness between coughs, harshness, and audible obstruction.

            Classification rules you MUST follow:
            - "low" only for a single clear, healthy cough with no pathological auditory signs.
            - "medium" for prolonged, harsh, wet-sounding or repeated coughing.
            - "high" for wheezing, rattling congestion, prolonged violent coughing fits, or the
              kind of cough commonly associated with tuberculosis presentations.
            - If the recording is too short, unclear or not a cough at all, return "unclear" and
              explain that in findings. Never invent audio features you cannot perceive.

            Findings and recommendation read like a note a clinician can skim in ten seconds.
            Always remind the reader that an in-person clinical assessment is required.
            PROMPT;
    }

    /**
     * Get the agent's structured output schema definition.
     */
    public function schema(JsonSchema $schema): array
    {
        return [
            'risk_level' => $schema->string()->required(),
            'findings' => $schema->string()->required(),
            'recommendation' => $schema->string()->required(),
        ];
    }
}
