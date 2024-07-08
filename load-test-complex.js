import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Custom metrics
const addCommentErrors = new Counter('add_comment_errors');
const deletePostErrors = new Counter('delete_post_errors');

// Credentials
const email = __ENV.EMAIL
const pass = __ENV.PASS

// URLs
const url = __ENV.URL
const loginUrl = url + '/users/login'
const articleUrl = url + '/articles'
let postSlug;

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

export function setup() {
    // Login to get the token
    const loginRes = http.post(loginUrl, JSON.stringify({
        user: {
            email: email,
            password: pass,
        }
    }), {
        headers: { 'Content-Type': 'application/json' }
    })

    check(loginRes, {
        'login successful': (res) => res.status === 200,
        'token present': (res) => res.json('user.token') !== '',
    })

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
    })

    check(createPostRes, {
        'post created': (res) => res.status === 201,
        'post slug present': (res) => res.json('article.slug') !== '',
    })

    postSlug = createPostRes.json('article.slug');

    return { authToken: authToken, postSlug: postSlug }
}

export default function (data) {
    const authToken = data.authToken;
    const postSlug = data.postSlug;
    const addCommentUrl = `${url}/articles/${postSlug}/comments`;
    const commentNumber = (__VU - 1) * 33 + __ITER + 1;
    const comment = `LOAD test comment ${commentNumber}`

    // Add comment
    const addCommentRes = http.post(addCommentUrl, JSON.stringify({
        comment: {
            body: comment,
        }
    }), {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${authToken}`,
        }
    })

    check(addCommentRes, {
        'comment added': (res) => res.status === 200,
        'response time < 600ms': (res) => res.timings.duration < 600,
        'comment body is correct': (res) => {
            const responseBody = JSON.parse(res.body)
            return responseBody.comment.body === comment
        },
        'no errors in body': (res) => !res.json('errors'), // Ensure no errors in the response body
    }) || addCommentErrors.add(1)

    sleep(3)
}

export function teardown(data) {
    const authToken = data.authToken;
    const postSlug = data.postSlug;
    const deletePostUrl = `${url}/articles/${postSlug}`;

    const deletePostRes = http.del(deletePostUrl, null, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${authToken}`,
        }
    })

    check(deletePostRes, {
        'post deleted': (res) => res.status === 204,
    }) || deletePostErrors.add(1);
}
