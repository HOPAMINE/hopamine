/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminTableCounts from "../adminTableCounts.js";
import type * as badges from "../badges.js";
import type * as conversations from "../conversations.js";
import type * as hackathonClaims from "../hackathonClaims.js";
import type * as hackathonParticipations from "../hackathonParticipations.js";
import type * as lib_badgeKinds from "../lib/badgeKinds.js";
import type * as lib_badgeRecords from "../lib/badgeRecords.js";
import type * as lib_builderNumbers from "../lib/builderNumbers.js";
import type * as lib_conversationAccess from "../lib/conversationAccess.js";
import type * as lib_currentUser from "../lib/currentUser.js";
import type * as lib_hackathonProjectCount from "../lib/hackathonProjectCount.js";
import type * as lib_projectFields from "../lib/projectFields.js";
import type * as lib_projectJoinCode from "../lib/projectJoinCode.js";
import type * as lib_projectUrls from "../lib/projectUrls.js";
import type * as lib_seedHackathonDirectory from "../lib/seedHackathonDirectory.js";
import type * as lib_seedHackathonStaffProject from "../lib/seedHackathonStaffProject.js";
import type * as lib_tableCounts from "../lib/tableCounts.js";
import type * as lib_usernames from "../lib/usernames.js";
import type * as messages from "../messages.js";
import type * as presence from "../presence.js";
import type * as projects from "../projects.js";
import type * as seedHackathonProjects from "../seedHackathonProjects.js";
import type * as seedHackathonStaffProject from "../seedHackathonStaffProject.js";
import type * as seedZimaTestUsers from "../seedZimaTestUsers.js";
import type * as users from "../users.js";
import type * as zimaGlobe from "../zimaGlobe.js";
import type * as zimaSearch from "../zimaSearch.js";
import type * as zimaSearchLlm from "../zimaSearchLlm.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminTableCounts: typeof adminTableCounts;
  badges: typeof badges;
  conversations: typeof conversations;
  hackathonClaims: typeof hackathonClaims;
  hackathonParticipations: typeof hackathonParticipations;
  "lib/badgeKinds": typeof lib_badgeKinds;
  "lib/badgeRecords": typeof lib_badgeRecords;
  "lib/builderNumbers": typeof lib_builderNumbers;
  "lib/conversationAccess": typeof lib_conversationAccess;
  "lib/currentUser": typeof lib_currentUser;
  "lib/hackathonProjectCount": typeof lib_hackathonProjectCount;
  "lib/projectFields": typeof lib_projectFields;
  "lib/projectJoinCode": typeof lib_projectJoinCode;
  "lib/projectUrls": typeof lib_projectUrls;
  "lib/seedHackathonDirectory": typeof lib_seedHackathonDirectory;
  "lib/seedHackathonStaffProject": typeof lib_seedHackathonStaffProject;
  "lib/tableCounts": typeof lib_tableCounts;
  "lib/usernames": typeof lib_usernames;
  messages: typeof messages;
  presence: typeof presence;
  projects: typeof projects;
  seedHackathonProjects: typeof seedHackathonProjects;
  seedHackathonStaffProject: typeof seedHackathonStaffProject;
  seedZimaTestUsers: typeof seedZimaTestUsers;
  users: typeof users;
  zimaGlobe: typeof zimaGlobe;
  zimaSearch: typeof zimaSearch;
  zimaSearchLlm: typeof zimaSearchLlm;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
