<?php

namespace App\Swagger;

use L5Swagger\Generator as BaseGenerator;
use OpenApi\Generator as OpenApiGenerator;

class CustomGenerator extends BaseGenerator
{
    protected bool $analyserAlreadySet = false;

    protected function createOpenApiGenerator(): OpenApiGenerator
    {
        $generator = parent::createOpenApiGenerator();

        // Mark that the analyser was set by the custom factory
        // (the parent createOpenApiGenerator calls our custom factory which sets the analyser)
        $this->analyserAlreadySet = true;

        return $generator;
    }

    protected function setAnalyser(OpenApiGenerator $generator): void
    {
        // Only set analyser if it wasn't already set by the custom factory
        if ($this->analyserAlreadySet) {
            return;
        }

        parent::setAnalyser($generator);
    }
}
