import { getUser } from "./session.js";

/**
 * Who answers for a storage location's stock, and whether that's the
 * person signed in. Receiving into a location and disposing from it are
 * its custodian's (or alternate's) job. For now this is only shown as a
 * hint -- nobody is stopped.
 *
 * location: { name, custodian_user_id, custodian_name, alternate_custodian_user_id, alternate_custodian_name }
 * action:   what is being done there, e.g. "Receiving into" / "Disposal from"
 * Returns { text, warn } -- warn when there's no custodian or it's someone else.
 */
export function custodianHint(location, action = "Stock at") {
    if (!location) return { text: "", warn: false };

    if (!location.custodian_name) {
        return { text: `No custodian assigned to ${location.name} yet (set one under Pharmacy > Storage Locations).`, warn: true };
    }

    const me = Number(getUser()?.id || 0);
    const alternate = location.alternate_custodian_name ? ` (alternate: ${location.alternate_custodian_name})` : "";

    if (me && Number(location.custodian_user_id) === me) {
        return { text: `You are the custodian of ${location.name}.`, warn: false };
    }

    if (me && Number(location.alternate_custodian_user_id) === me) {
        return { text: `You are the alternate custodian of ${location.name} (custodian: ${location.custodian_name}).`, warn: false };
    }

    return {
        text: `${action} ${location.name} is the job of its custodian, ${location.custodian_name}${alternate}. You are neither — make sure they know.`,
        warn: true
    };
}
