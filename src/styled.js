import {Component} from 'react';
import PropTypes from 'prop-types';
import assignDeep from 'assign-deep';
import {injectStylePrefixed} from 'styletron-utils';

let unnamedCounter = 0;

export default class Styled extends Component {

  // we pull context from above
  static contextTypes = {

    // from StyletronProvider (see styletron-react)
    styletron: PropTypes.object.isRequired,

    // from ThemeProvider
    themeProvider: PropTypes.shape({
      theme:            PropTypes.object.isRequired,
      installComponent: PropTypes.func.isRequired,
      applyMiddleware:  PropTypes.func.isRequired
    }).isRequired
  };

  /*
   every styled component can take two props which allow you to override
   the styles generated by the component directly:

   * className => if the user of a component passes a className prop explicitly,
     it is prepended to the list of styletron classes. use this to link to legacy or
     hard-coded classes in an external CSS file (e.g., "margined" or "select-multi")

   * style => the user can pass in a styletron object to override specific styles.
     this overloads React's "style" prop. it integrates with the styletron system,
     so the result of passing a style prop will actually be additional classes,
     not an inline style attribute
  */

  static propTypes = {
    // basic props
    themeName:    PropTypes.string,   // unnamed components are not themeable; useful for one-offs
    staticStyle:  PropTypes.object,
    dynamicStyle: PropTypes.func,

    // DEPRECATED; will be removed very quickly
    name:         PropTypes.string,

    // for per-instance styling
    className:    PropTypes.string,
    style:        PropTypes.object,

    // we only accept a render callback function for children
    children:     PropTypes.func.isRequired
  }

  constructor(props, context) {
    super(props, context);

    if (!context.themeProvider) {
      console.error('Styled components must be rendered inside a ThemeProvider.');  // eslint-disable-line
    }

    this.componentName = props.themeName || props.name;

    // ensure that the component's static style is inserted into the master theme.
    // unnamed components are not installed into the theme
    //
    if (this.componentName)
      context.themeProvider.installComponent(this.componentName, props.staticStyle || {});
    else
      this.componentName = `Unnamd_${unnamedCounter++}`;   // guaranteed to not be a legit component name in the theme
  }

  // this is where the magic happens. here we figure out what styles need to be applied
  // to this instance of the component. returns an object of styletron attributes (not classes)
  //
  getStyle() {
    let
      // the theme is stored on context
      masterTheme = this.context.themeProvider.theme,

      // the theme for this component only. the fallback is needed for unnamed (unthemed) components
      componentTheme = masterTheme[this.componentName] || this.props.staticStyle,

      styleObj;

    // use the component's dynamic styling function to adjust the styles for this instance
    // based on props
    //
    if (typeof this.props.dynamicStyle === 'function') {
      styleObj = this.props.dynamicStyle({

        // the base theme for this component
        componentTheme,

        // the global meta (for colors and other global attributes)
        globalMeta: masterTheme.meta,

        // last, but not least, the props
        props: this.props
      });
    }
    else
      styleObj = componentTheme;

    // all components accept a "style" prop for custom styletron attributes.
    // this overrides React's use of "style", as described above.
    //
    if (this.props.style)
      styleObj = assignDeep({}, styleObj, this.props.style);

    // middleware
    styleObj = this.context.themeProvider.applyMiddleware(styleObj);

    return styleObj;
  }

  render() {
    const styleProperties = this.getStyle(),
          {className, children, name, themeName, staticStyle, dynamicStyle, style, ...passThroughProps} = this.props,    // eslint-disable-line
          {styletron, themeProvider: {theme}} = this.context,

          // convert the style properties into a set of classes. this is where
          // we let styletron do its magic
          styletronClasses = injectStylePrefixed(styletron, styleProperties),

          paramBlock = {
            // the base theme of your component
            componentTheme: theme[this.componentName],

            // the global meta (for colors, etc)
            globalMeta: theme.meta
          };

    // invoke the render callback with three params
    return children(

      // PARAM 1: className
      // (see above for comments on the use of the className prop for legacy CSS classes)
      (className ? className + ' ' : '') + styletronClasses,

      // PARAM 2: pass through props
      passThroughProps,

      // PARAM 3: everything else, wrapped up into an object
      paramBlock
    );
  }
}
