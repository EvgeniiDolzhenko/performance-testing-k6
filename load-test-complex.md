This load test script is designed to simulate a typical usage pattern of adding comments to a post and then deleting the post. The script is written using the K6 load testing tool. Below is a breakdown of the script components and their functions.

<hr>

Importing Required Modules and Metrics
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
<ul>
<li><b>http</b>: Provides methods to make HTTP requests.</li>
<li><b>check</b>: Used to validate response conditions.</li>
<li><b>sleep</b>: Pauses execution for a specified duration.</li>
<li><b>Counter</b>: Custom metric to count errors.</li>
</ul>
<hr>
