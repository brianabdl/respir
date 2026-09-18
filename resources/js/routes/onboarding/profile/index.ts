import {
    queryParams,
    type RouteQueryOptions,
    type RouteDefinition,
    type RouteFormDefinition,
} from './../../../wayfinder';
/**
 * @see \App\Http\Controllers\OnboardingController::edit
 * @see app/Http/Controllers/OnboardingController.php:15
 * @route '/onboarding/profile'
 */
export const edit = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: edit.url(options),
    method: 'get',
});

edit.definition = {
    methods: ['get', 'head'],
    url: '/onboarding/profile',
} satisfies RouteDefinition<['get', 'head']>;

/**
 * @see \App\Http\Controllers\OnboardingController::edit
 * @see app/Http/Controllers/OnboardingController.php:15
 * @route '/onboarding/profile'
 */
edit.url = (options?: RouteQueryOptions) => {
    return edit.definition.url + queryParams(options);
};

/**
 * @see \App\Http\Controllers\OnboardingController::edit
 * @see app/Http/Controllers/OnboardingController.php:15
 * @route '/onboarding/profile'
 */
edit.get = (options?: RouteQueryOptions): RouteDefinition<'get'> => ({
    url: edit.url(options),
    method: 'get',
});

/**
 * @see \App\Http\Controllers\OnboardingController::edit
 * @see app/Http/Controllers/OnboardingController.php:15
 * @route '/onboarding/profile'
 */
edit.head = (options?: RouteQueryOptions): RouteDefinition<'head'> => ({
    url: edit.url(options),
    method: 'head',
});

/**
 * @see \App\Http\Controllers\OnboardingController::edit
 * @see app/Http/Controllers/OnboardingController.php:15
 * @route '/onboarding/profile'
 */
const editForm = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: edit.url(options),
    method: 'get',
});

/**
 * @see \App\Http\Controllers\OnboardingController::edit
 * @see app/Http/Controllers/OnboardingController.php:15
 * @route '/onboarding/profile'
 */
editForm.get = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: edit.url(options),
    method: 'get',
});

/**
 * @see \App\Http\Controllers\OnboardingController::edit
 * @see app/Http/Controllers/OnboardingController.php:15
 * @route '/onboarding/profile'
 */
editForm.head = (options?: RouteQueryOptions): RouteFormDefinition<'get'> => ({
    action: edit.url({
        [options?.mergeQuery ? 'mergeQuery' : 'query']: {
            _method: 'HEAD',
            ...(options?.query ?? options?.mergeQuery ?? {}),
        },
    }),
    method: 'get',
});

edit.form = editForm;

/**
 * @see \App\Http\Controllers\OnboardingController::update
 * @see app/Http/Controllers/OnboardingController.php:23
 * @route '/onboarding/profile'
 */
export const update = (
    options?: RouteQueryOptions,
): RouteDefinition<'post'> => ({
    url: update.url(options),
    method: 'post',
});

update.definition = {
    methods: ['post'],
    url: '/onboarding/profile',
} satisfies RouteDefinition<['post']>;

/**
 * @see \App\Http\Controllers\OnboardingController::update
 * @see app/Http/Controllers/OnboardingController.php:23
 * @route '/onboarding/profile'
 */
update.url = (options?: RouteQueryOptions) => {
    return update.definition.url + queryParams(options);
};

/**
 * @see \App\Http\Controllers\OnboardingController::update
 * @see app/Http/Controllers/OnboardingController.php:23
 * @route '/onboarding/profile'
 */
update.post = (options?: RouteQueryOptions): RouteDefinition<'post'> => ({
    url: update.url(options),
    method: 'post',
});

/**
 * @see \App\Http\Controllers\OnboardingController::update
 * @see app/Http/Controllers/OnboardingController.php:23
 * @route '/onboarding/profile'
 */
const updateForm = (
    options?: RouteQueryOptions,
): RouteFormDefinition<'post'> => ({
    action: update.url(options),
    method: 'post',
});

/**
 * @see \App\Http\Controllers\OnboardingController::update
 * @see app/Http/Controllers/OnboardingController.php:23
 * @route '/onboarding/profile'
 */
updateForm.post = (
    options?: RouteQueryOptions,
): RouteFormDefinition<'post'> => ({
    action: update.url(options),
    method: 'post',
});

update.form = updateForm;

const profile = {
    edit: Object.assign(edit, edit),
    update: Object.assign(update, update),
};

export default profile;
