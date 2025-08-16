"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toValidTag = void 0;
/**
 * Filters out invalid tag characters (https://docs.aws.amazon.com/tag-editor/latest/userguide/tagging.html).
 * Throws an error if the resulting tag has zero length.
 */
const toValidTag = (tag) => {
    const validTag = tag.replace(/[^a-zA-Z0-9_.:/=+@\f\n\r\t\v\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff-]/g, '');
    if (!validTag) {
        throw new Error(`The valid tag for '${tag}' is an empty string.`);
    }
    return validTag;
};
exports.toValidTag = toValidTag;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG8tdmFsaWQtdGFnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vYmFja2VuZC1jZGsvY2RrL3RvLXZhbGlkLXRhZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQTs7O0dBR0c7QUFDSSxNQUFNLFVBQVUsR0FBRyxDQUFDLEdBQVcsRUFBVSxFQUFFO0lBQ2hELE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQzFCLG9HQUFvRyxFQUNwRyxFQUFFLENBQ0gsQ0FBQztJQUVGLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsc0JBQXNCLEdBQUcsdUJBQXVCLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRUQsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQyxDQUFDO0FBWFcsUUFBQSxVQUFVLGNBV3JCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBGaWx0ZXJzIG91dCBpbnZhbGlkIHRhZyBjaGFyYWN0ZXJzIChodHRwczovL2RvY3MuYXdzLmFtYXpvbi5jb20vdGFnLWVkaXRvci9sYXRlc3QvdXNlcmd1aWRlL3RhZ2dpbmcuaHRtbCkuXG4gKiBUaHJvd3MgYW4gZXJyb3IgaWYgdGhlIHJlc3VsdGluZyB0YWcgaGFzIHplcm8gbGVuZ3RoLlxuICovXG5leHBvcnQgY29uc3QgdG9WYWxpZFRhZyA9ICh0YWc6IHN0cmluZyk6IHN0cmluZyA9PiB7XG4gIGNvbnN0IHZhbGlkVGFnID0gdGFnLnJlcGxhY2UoXG4gICAgL1teYS16QS1aMC05Xy46Lz0rQFxcZlxcblxcclxcdFxcdlxcdTAwMjBcXHUwMGEwXFx1MTY4MFxcdTIwMDAtXFx1MjAwYVxcdTIwMjhcXHUyMDI5XFx1MjAyZlxcdTIwNWZcXHUzMDAwXFx1ZmVmZi1dL2csXG4gICAgJydcbiAgKTtcblxuICBpZiAoIXZhbGlkVGFnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBUaGUgdmFsaWQgdGFnIGZvciAnJHt0YWd9JyBpcyBhbiBlbXB0eSBzdHJpbmcuYCk7XG4gIH1cblxuICByZXR1cm4gdmFsaWRUYWc7XG59O1xuIl19