import { Accounts } from 'meteor/accounts-base';

Accounts.onCreateUser(function onCreateUser(options, user) {
  if (!user.username) {
    return Object.assign(user, { username: user.email.split('@')[0] })
  }
  return user
})
