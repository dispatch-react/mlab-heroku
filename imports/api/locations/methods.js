import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { Meteor } from 'meteor/meteor';
import { Locations } from './locations';
import { Activity } from '../activity/activity'

export const getNearestLocations = new ValidatedMethod({
  name: 'Locations.getNearestLocations',
  validate: new SimpleSchema({
    latitude: { type: Number, decimal: true },
    longitude: { type: Number, decimal: true },
  }).validator(),
  run({ latitude, longitude }) {
    return Locations.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: 5000,
        }
      }
    }, { limit: 10 }).fetch();
  },
});

export const checkInOut = new ValidatedMethod({
  name: 'Locations.checkInOut',
  validate: new SimpleSchema({
    locationId: { type: String },
    status: { type: String, allowedValues: ['in', 'out'] },
  }).validator(),
  run({ locationId, status }) {
    if (!this.userId) {
      throw new Meteor.Error('Locations.changeCheckin.notLoggedIn',
        'Must be logged in to change checkin status.');
    }
    console.log(`location: ${locationId} and status: ${status}`)
    const location = Locations.findOne({ _id: locationId })
    if (!location) {
      throw new Meteor.Error('Locations.changeCheckin.invalidLocationId',
              'Must pass a valid location id to change checkin status.');
    }  else if (status === 'in' && location.checkedInUserId === this.userId) {
      throw new Meteor.Error('Locations.changeCheckin.alreadyCheckedIn',
              'You are already checked in to this location');
    }  else if (status === 'in' && typeof location.checkedInUserId === 'string') {
      throw new Meteor.Error('Locations.changeCheckin.locationBusy',
              'This location is in use!');
    } else if (status === 'out' && location.checkedInUserId !== this.userId) {
      throw new Meteor.Error('Locations.changeCheckin.notCheckedIn',
              'You are not currently checked in.');
    } else if (status === 'in' && Locations.findOne({ checkedInUserId: this.userId })) {
      throw new Meteor.Error('Locations.changeCheckin.alreadyCheckedInElsewhere',
              'You are currently checked in at another location.');
    } else {
      Activity.insert({
        createdAt: new Date(),
        username: Meteor.user().username,
        userId: this.userId,
        type: status,
        locationId,
      });
      Locations.update({
        _id: locationId,
      }, {
        $set: {
          checkedInUserId: status === 'in' ? this.userId : null,
        }
      })
    }
  }
})
