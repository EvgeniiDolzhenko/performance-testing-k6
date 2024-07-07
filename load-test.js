import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Custom metrics
const addCommentErrors = new Counter('add_comment_errors');
const deleteCommentErrors = new Counter('delete_comment_errors');

// Credentials
const email = __ENV.EMAIL
const pass = __ENV.PASS

// URLs
const url = __ENV.URL
const loginUrl = url+'/users/login'
const postSlug = 'soak-2980'
const addCommentUrl = `${url}/articles/${postSlug}/comments`

export let options = {
    stages: [
        { duration: '1m', target: 10 }, 
        { duration: '3m', target: 20 }, 
        { duration: '1m', target: 60 }, 
        { duration: '3m', target: 60 }, 
        { duration: '1m', target: 0 },  
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
        add_comment_errors: ['count<10'], // Less than 10 errors are allowed for adding comments
        delete_comment_errors: ['count<10'], // Less than 10 errors are allowed for deleting comments
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

    const authToken = loginRes.json('user.token')
    return { authToken: authToken }
}

export default function (data) {
    const authToken = data.authToken;
    const commentNumber = (__VU - 1) * 3 + __ITER + 1;
    const comment = `Soak test comment ${commentNumber}`

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

    const createdComment = addCommentRes.json('comment')
    const commentId = createdComment ? createdComment.id : null

    check(addCommentRes, {
        'comment added': (res) => res.status === 200,
        'response time < 600ms': (res) => res.timings.duration < 600,
        'comment body is correct': (res) => {
            const responseBody = JSON.parse(res.body)
            return responseBody.comment.body === comment
        },
        'no errors in body': (res) => !res.json('errors'), // Ensure no errors in the response body
    }) || addCommentErrors.add(1)

    if (commentId) {
        // Delete comment
        const deleteCommentUrl = `${addCommentUrl}/${commentId}`;
        const deleteCommentRes = http.del(deleteCommentUrl, null, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${authToken}`,
            }
        })

        check(deleteCommentRes, {
            'comment deleted': (res) => res.status === 200,
            'response time < 600ms': (res) => res.timings.duration < 600,
        }) || deleteCommentErrors.add(1);
    } else {
        deleteCommentErrors.add(1)
    }

    sleep(3)
}
