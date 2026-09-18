import { Form, Head, Link, usePage } from '@inertiajs/react';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import OnboardingController from '@/actions/App/Http/Controllers/OnboardingController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { PhoneInput } from '@/components/ui/phone-input';
import { Spinner } from '@/components/ui/spinner';
import { privacy } from '@/routes';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
};

const fieldClassName =
    'rounded-[6px] border border-white/20 bg-white/5 text-white placeholder:text-gray-600 focus-visible:border-white focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-0';

function toIsoDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export default function OnboardingProfile() {
    const { auth } = usePage<PageProps>().props;
    const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>();
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const today = new Date();

    return (
        <>
            <Head title="Complete your profile" />

            <div
                className="dark relative flex min-h-screen w-full items-center justify-center bg-black text-white"
                style={{ fontFamily: 'Geist, sans-serif' }}
            >
                <div className="absolute top-8 left-8 z-50">
                    <img
                        src="/Respir logo.png"
                        alt="Respir Logo"
                        className="h-10 w-auto"
                    />
                </div>

                <div className="w-full max-w-lg px-8 py-16">
                    <div className="mb-10">
                        <h1 className="text-3xl font-semibold tracking-tight">
                            Complete your profile
                        </h1>
                        <p className="mt-2 text-sm text-[#A1A1AA]">
                            Welcome, {auth.user.name}. A few more details help
                            your care team personalize every consult.
                        </p>
                    </div>

                    <Form
                        {...OnboardingController.update.form()}
                        disableWhileProcessing
                        className="flex flex-col gap-6"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="date_of_birth"
                                                className="text-gray-300"
                                            >
                                                Date of birth
                                            </Label>
                                            <input
                                                type="hidden"
                                                name="date_of_birth"
                                                value={
                                                    dateOfBirth
                                                        ? toIsoDateString(
                                                              dateOfBirth,
                                                          )
                                                        : ''
                                                }
                                            />
                                            <Popover
                                                open={datePickerOpen}
                                                onOpenChange={setDatePickerOpen}
                                            >
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        id="date_of_birth"
                                                        type="button"
                                                        variant="outline"
                                                        autoFocus
                                                        className={`h-9 w-full justify-between px-3 py-1 text-left text-base font-normal shadow-xs hover:bg-white/10 hover:text-white md:text-sm ${fieldClassName} ${dateOfBirth ? '' : 'text-gray-600'}`}
                                                    >
                                                        {dateOfBirth
                                                            ? dateOfBirth.toLocaleDateString()
                                                            : 'Select date'}
                                                        <CalendarIcon className="size-4 text-gray-400" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    align="start"
                                                    className="dark w-auto border-white/20 bg-black p-0 text-white"
                                                >
                                                    <Calendar
                                                        mode="single"
                                                        selected={dateOfBirth}
                                                        onSelect={(date) => {
                                                            setDateOfBirth(
                                                                date,
                                                            );
                                                            setDatePickerOpen(
                                                                false,
                                                            );
                                                        }}
                                                        captionLayout="dropdown"
                                                        defaultMonth={
                                                            new Date(
                                                                today.getFullYear() -
                                                                    30,
                                                                today.getMonth(),
                                                            )
                                                        }
                                                        startMonth={
                                                            new Date(
                                                                today.getFullYear() -
                                                                    120,
                                                                0,
                                                            )
                                                        }
                                                        endMonth={today}
                                                        disabled={{
                                                            after: today,
                                                        }}
                                                        classNames={{
                                                            day_button:
                                                                'hover:bg-white/10 hover:text-white data-[selected-single=true]:bg-white data-[selected-single=true]:text-black',
                                                            today: 'bg-white/10 text-white rounded-md data-[selected=true]:rounded-none',
                                                        }}
                                                        autoFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <InputError
                                                message={errors.date_of_birth}
                                            />
                                        </div>

                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="sex"
                                                className="text-gray-300"
                                            >
                                                Sex / gender
                                            </Label>
                                            <select
                                                id="sex"
                                                name="sex"
                                                required
                                                defaultValue=""
                                                className={`h-9 px-3 py-1 text-base shadow-xs outline-none md:text-sm ${fieldClassName}`}
                                            >
                                                <option
                                                    value=""
                                                    disabled
                                                    className="text-black"
                                                >
                                                    Select
                                                </option>
                                                <option
                                                    value="male"
                                                    className="text-black"
                                                >
                                                    Male
                                                </option>
                                                <option
                                                    value="female"
                                                    className="text-black"
                                                >
                                                    Female
                                                </option>
                                                <option
                                                    value="other"
                                                    className="text-black"
                                                >
                                                    Other
                                                </option>
                                                <option
                                                    value="unknown"
                                                    className="text-black"
                                                >
                                                    Prefer not to say
                                                </option>
                                            </select>
                                            <InputError message={errors.sex} />
                                        </div>
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="phone"
                                            className="text-gray-300"
                                        >
                                            Phone number
                                        </Label>
                                        <PhoneInput
                                            id="phone"
                                            name="phone"
                                            required
                                            autoComplete="tel"
                                            placeholder="555 123 4567"
                                            triggerClassName={`${fieldClassName} hover:bg-white/10 hover:text-white`}
                                            inputClassName={fieldClassName}
                                            popoverClassName="dark border-white/20 bg-black text-white"
                                            itemClassName="hover:bg-white/10 hover:text-white"
                                        />
                                        <InputError message={errors.phone} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="address"
                                            className="text-gray-300"
                                        >
                                            Home address
                                        </Label>
                                        <textarea
                                            id="address"
                                            name="address"
                                            required
                                            rows={2}
                                            autoComplete="street-address"
                                            placeholder="Street, city, state, postal code"
                                            className={`px-3 py-2 text-base shadow-xs outline-none md:text-sm ${fieldClassName}`}
                                        />
                                        <InputError message={errors.address} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="emergency_contact_name"
                                            className="text-gray-300"
                                        >
                                            Emergency contact name
                                        </Label>
                                        <Input
                                            id="emergency_contact_name"
                                            type="text"
                                            required
                                            autoComplete="name"
                                            name="emergency_contact_name"
                                            placeholder="Full name"
                                            className={fieldClassName}
                                        />
                                        <InputError
                                            message={
                                                errors.emergency_contact_name
                                            }
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="emergency_contact_phone"
                                            className="text-gray-300"
                                        >
                                            Emergency contact phone
                                        </Label>
                                        <PhoneInput
                                            id="emergency_contact_phone"
                                            name="emergency_contact_phone"
                                            required
                                            placeholder="555 987 6543"
                                            triggerClassName={`${fieldClassName} hover:bg-white/10 hover:text-white`}
                                            inputClassName={fieldClassName}
                                            popoverClassName="dark border-white/20 bg-black text-white"
                                            itemClassName="hover:bg-white/10 hover:text-white"
                                        />
                                        <InputError
                                            message={
                                                errors.emergency_contact_phone
                                            }
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                id="privacy_policy_accepted"
                                                name="privacy_policy_accepted"
                                                required
                                                className="mt-0.5 rounded-[4px] border-white/20 bg-white/5 focus-visible:ring-1 focus-visible:ring-white focus-visible:ring-offset-0 data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                                            />
                                            <Label
                                                htmlFor="privacy_policy_accepted"
                                                className="text-sm font-normal text-gray-300"
                                            >
                                                I have read and agree to the{' '}
                                                <Link
                                                    href={privacy()}
                                                    target="_blank"
                                                    className="text-white underline underline-offset-4 hover:text-gray-200"
                                                >
                                                    Privacy Policy
                                                </Link>
                                                .
                                            </Label>
                                        </div>
                                        <InputError
                                            message={
                                                errors.privacy_policy_accepted
                                            }
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        className="mt-4 h-11 w-full rounded-[6px] bg-white font-semibold text-black transition-colors hover:bg-gray-200"
                                        disabled={processing}
                                    >
                                        {processing && (
                                            <Spinner className="mr-2" />
                                        )}
                                        Continue
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </div>
            </div>
        </>
    );
}
