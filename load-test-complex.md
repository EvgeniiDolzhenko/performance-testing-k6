This load test script is designed to simulate a typical usage pattern of adding comments to a post and then deleting the post. The script is written using the K6 load testing tool. Below is a breakdown of the script components and their functions.

<hr>

Importing Required Modules and Metrics
```
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
```

<ul>
<li><b>http</b>: Provides methods to make HTTP requests.</li>
<li><b>check</b>: Used to validate response conditions.</li>
<li><b>sleep</b>: Pauses execution for a specified duration.</li>
<li><b>Counter</b>: Custom metric to count errors.</li>
</ul>
<hr>


Custom Metrics
```
const addCommentErrors = new Counter('add_comment_errors');
const deletePostErrors = new Counter('delete_post_errors');
```
<p>These custom counters track the number of errors encountered when adding comments and deleting posts.</p>
<hr>

Setting Up Credentials and URLs
```
const email = __ENV.EMAIL;
const pass = __ENV.PASS;
const url = __ENV.URL;
const loginUrl = `${url}/users/login`;
const articleUrl = `${url}/articles`;
let postSlug;
```

<ul>
<li><b>email</b> and <b>pass</b>: User credentials for login, passed as environment variables.</li>
<li><b>url</b>: Base URL of the application, also passed as an environment variable.</li>
<li><b>loginUrl</b> and <b>articleUrl</b>: Constructed endpoints for login and creating articles.</li>
</ul>
<hr>

Load Test Options
```
export let options = {
    stages: [
        { duration: '30s', target: 10 }, 
        { duration: '30s', target: 20 }, 
        { duration: '3m', target: 60 },  
        { duration: '3m', target: 60 },  
        { duration: '1m', target: 0 },   
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], 
        add_comment_errors: ['count<10'], 
        delete_post_errors: ['count<10'], 
    },
};
```
<ul>
<li><b>stages</b>: Defines the ramp-up and ramp-down stages of virtual users (VUs).</li>
<ul>
    <li>Gradually increases the load from 10 to 60 VUs, holds for 3 minutes, and then ramps down.</li>
</ul>
<li><b>thresholds</b>: Sets performance criteria.</li>
<ul>
    <li>95% of requests should be under 500ms.</li>
    <li>Less than 10 errors are allowed for adding comments and deleting posts.</li>
</ul>
</ul>
<hr>

Setup Function
```
export function setup() {
    // Login to get the token
    const loginRes = http.post(loginUrl, JSON.stringify({
        user: {
            email: email,
            password: pass,
        }
    }), {
        headers: { 'Content-Type': 'application/json' }
    });

    check(loginRes, {
        'login successful': (res) => res.status === 200,
        'token present': (res) => res.json('user.token') !== '',
    });

    const authToken = loginRes.json('user.token');

    // Create the post
    const postTitle = 'THIS IS LOAD TESTING POST';
    const postBody = 'This is the body of the LOAD test post.';
    const postDescription = 'Description of the LOAD test post';
    const postTags = ['test', 'load'];

    const createPostRes = http.post(articleUrl, JSON.stringify({
        article: {
            title: postTitle,
            description: postDescription,
            body: postBody,
            tagList: postTags,
        }
    }), {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${authToken}`,
        }
    });

    check(createPostRes, {
        'post created': (res) => res.status === 201,
        'post slug present': (res) => res.json('article.slug') !== '',
    });

    postSlug = createPostRes.json('article.slug');

    return { authToken: authToken, postSlug: postSlug };
}
```

