# Queue contract

The settings UI passes a string limit; 0 means paused, omitted means 3. Positive integers
limit how many jobs are processed. runQueue must save jobs sequentially in input order,
resolve only after all selected saves complete, and reject on a save failure without
starting later saves. The caller retains ownership of the jobs array and expects it to
remain unchanged. Jobs are selected by ascending numeric priority. Node ESM is supported;
default exports are the project's established convention.
