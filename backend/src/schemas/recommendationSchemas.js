// Zod schemas for the /api/travel/recommendations payloads.
//
// The user profile is wide and partially user-typed (travelVibeDescription is
// freeform), so we bound every field with reasonable maxima and pass through
// unknown keys with `.passthrough()` — the goal is to reject obviously
// malformed or prompt-injection-shaped requests, not to enforce the full
// product model here.
import { z } from 'zod';

const shortString = z.string().trim().max(120);
const mediumString = z.string().trim().max(500);
const longString = z.string().trim().max(2000);
const isoDate = z.string().trim().max(40).optional().or(z.literal(''));

const basicSchema = z.object({
  destination: shortString.optional(),
  destinationId: z.union([z.string().max(60), z.number()]).optional(),
  destinationCode: shortString.optional(),
  destinationCountry: shortString.optional(),
  budget: z.number().nonnegative().max(1_000_000),
  budgetPerPerson: z.number().nonnegative().max(1_000_000).optional(),
  style: shortString.optional(),
  tripType: shortString.optional(),
  travelVibeDescription: longString.optional(),
  activities: z.array(shortString).max(40).optional(),
  maxFlightHours: z.number().nonnegative().max(48).optional(),
  destinationPreference: shortString.optional(),
  travelers: z.number().int().min(1).max(50).optional(),
}).passthrough();

const preferencesSchema = z.object({
  climate: shortString.optional(),
  accommodation: shortString.optional(),
  pace: shortString.optional(),
  gastronomy: shortString.optional(),
  natureVsCity: z.number().min(0).max(100).optional(),
  nightlife: shortString.optional(),
  activitiesBudget: z.number().nonnegative().max(100_000).optional(),
}).passthrough();

const constraintsSchema = z.object({
  budget: z.number().nonnegative().max(1_000_000).optional(),
  maxFlightHours: z.number().nonnegative().max(48).optional(),
  avoidCountries: z.array(shortString).max(50).optional(),
}).passthrough();

const availabilitySchema = z.object({
  startDate: isoDate,
  endDate: isoDate,
  duration: z.number().int().min(1).max(60).optional(),
  timeHorizon: shortString.optional(),
  idealDuration: shortString.optional(),
  flexibleDates: z.boolean().optional(),
  preferredMonths: z.array(shortString).max(12).optional(),
  originCity: shortString.optional(),
  professionalStatus: shortString.optional(),
  departureFlexibility: shortString.optional(),
}).passthrough();

const chatbotPreferencesSchema = z.object({
  tone: shortString.optional(),
}).passthrough();

export const recommendationsBodySchema = z.object({
  basic: basicSchema,
  preferences: preferencesSchema.optional(),
  constraints: constraintsSchema.optional(),
  availability: availabilitySchema.optional(),
  chatbotPreferences: chatbotPreferencesSchema.optional(),
}).passthrough();

// /signal — small behavioural event, much tighter bounds
export const signalBodySchema = z.object({
  destinationCity: shortString,
  signalType: z.enum(['click', 'save', 'reject', 'view', 'book']),
});
