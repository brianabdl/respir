<?php

namespace App\Domain\Consult\Services;

use App\Domain\Consult\DTOs\ClinicianBriefing;
use App\Domain\Consult\DTOs\CoughAnalysisResult;
use App\Domain\Consult\Exceptions\AiServiceUnavailable;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

class PythonAiClient
{
    /**
     * Send a cough recording to the Python service for embedding and classification.
     */
    public function analyzeCough(string $contents, string $filename, string $mimeType, bool $explain = true): CoughAnalysisResult
    {
        $response = $this->request()
            ->attach('audio', $contents, $filename, ['Content-Type' => $mimeType])
            ->post('/v1/cough/analyze', ['explain' => $explain]);

        $this->ensureSuccessful($response, 'cough analysis');

        return CoughAnalysisResult::fromServicePayload($response->json());
    }

    /**
     * Request a de-identified clinician briefing from the Python service.
     *
     * @param  array<string, mixed>  $payload
     */
    public function briefing(array $payload): ClinicianBriefing
    {
        $response = $this->request()->post('/v1/briefing', $payload);

        $this->ensureSuccessful($response, 'clinician briefing');

        return ClinicianBriefing::fromServicePayload($response->json());
    }

    /**
     * @param  array<int, string>  $texts
     * @return array<int, array<int, float>>
     */
    public function textEmbeddings(array $texts): array
    {
        $response = $this->request()->post('/v1/embeddings/text', ['texts' => $texts]);

        $this->ensureSuccessful($response, 'text embeddings');

        return $response->json('embeddings') ?? [];
    }

    private function request(): PendingRequest
    {
        return Http::baseUrl(rtrim((string) config('services.ai_service.url'), '/'))
            ->withHeaders(['X-Internal-Token' => (string) config('services.ai_service.token')])
            ->acceptJson()
            ->timeout((int) config('services.ai_service.timeout', 300))
            ->retry((int) config('services.ai_service.retries', 2), 500, throw: false);
    }

    private function ensureSuccessful(Response $response, string $operation): void
    {
        if ($response->successful()) {
            return;
        }

        logger()->warning('AI service request failed', [
            'operation' => $operation,
            'status' => $response->status(),
        ]);

        throw AiServiceUnavailable::forOperation($operation, $response->status());
    }
}
